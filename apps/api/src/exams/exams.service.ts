import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicService } from '../academic/academic.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateExamDto, EnterMarksDto } from './dto';

const GRADES = [
  { grade: 'A+', min: 90, point: 10 },
  { grade: 'A', min: 80, point: 9 },
  { grade: 'B+', min: 70, point: 8 },
  { grade: 'B', min: 60, point: 7 },
  { grade: 'C', min: 50, point: 6 },
  { grade: 'D', min: 35, point: 5 },
  { grade: 'F', min: 0, point: 0 },
];

function gradeFor(percentage: number) {
  return GRADES.find((g) => percentage >= g.min) || GRADES[GRADES.length - 1];
}

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService, private academic: AcademicService) {}

  async list() {
    const year = await this.academic.requireActiveYear();
    return this.prisma.exam.findMany({
      where: { academicYearId: year.id },
      include: { _count: { select: { marks: true, results: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateExamDto) {
    const year = await this.academic.requireActiveYear();
    return this.prisma.exam.create({
      data: {
        name: dto.name,
        type: dto.type || 'UNIT_TEST',
        weightagePct: dto.weightagePct ?? 100,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : null,
        academicYearId: year.id,
        status: 'MARKS_ENTRY',
      },
    });
  }

  /** Marks entry grid: all students of a section for one subject. */
  async marksSheet(user: AuthUser, examId: string, sectionId: string, subjectId: string) {
    const year = await this.academic.requireActiveYear();

    if (user.role === 'TEACHER') {
      const allowed = await this.prisma.teacherAllocation.findFirst({
        where: { staffId: user.staffId, sectionId, subjectId, academicYearId: year.id },
      });
      if (!allowed) throw new ForbiddenException('You do not teach that subject in that section');
    }

    const [exam, subject, enrollments, marks] = await Promise.all([
      this.prisma.exam.findUnique({ where: { id: examId } }),
      this.prisma.subject.findUnique({ where: { id: subjectId } }),
      this.prisma.enrollment.findMany({
        where: { sectionId, academicYearId: year.id, status: 'ACTIVE' },
        include: { student: true },
        orderBy: { rollNo: 'asc' },
      }),
      this.prisma.mark.findMany({ where: { examId, subjectId } }),
    ]);
    if (!exam) throw new NotFoundException('Exam not found');

    const map = new Map(marks.map((m) => [m.studentId, m]));
    return {
      exam: { id: exam.id, name: exam.name, status: exam.status },
      subject: { id: subject.id, name: subject.name, maxMarks: subject.maxMarks },
      isLocked: exam.status === 'LOCKED' || exam.status === 'PUBLISHED',
      rows: enrollments.map((e) => {
        const m = map.get(e.studentId);
        return {
          studentId: e.studentId,
          rollNo: e.rollNo,
          name: `${e.student.firstName} ${e.student.lastName}`,
          marksObtained: m?.marksObtained ?? null,
          status: m?.status || 'PRESENT',
          maxMarks: m?.maxMarks || subject.maxMarks,
        };
      }),
    };
  }

  /** FR-EXM-05/07: validation against max marks, and no edits after lock. */
  async enterMarks(user: AuthUser, dto: EnterMarksDto) {
    const exam = await this.prisma.exam.findUnique({ where: { id: dto.examId } });
    if (!exam) throw new NotFoundException('Exam not found');
    if (['LOCKED', 'PUBLISHED'].includes(exam.status) && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      throw new BadRequestException('Marks are locked. An admin-approved correction is needed to change them.');
    }

    const subject = await this.prisma.subject.findUnique({ where: { id: dto.subjectId } });
    const maxMarks = dto.maxMarks || subject.maxMarks;

    for (const row of dto.rows) {
      if (row.marksObtained != null && row.marksObtained > maxMarks)
        throw new BadRequestException(`Marks cannot be more than ${maxMarks}`);
      if (row.marksObtained != null && row.marksObtained < 0)
        throw new BadRequestException('Marks cannot be negative');

      await this.prisma.mark.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: dto.examId,
            studentId: row.studentId,
            subjectId: dto.subjectId,
          },
        },
        create: {
          examId: dto.examId,
          studentId: row.studentId,
          subjectId: dto.subjectId,
          marksObtained: row.status === 'ABSENT' ? null : row.marksObtained,
          maxMarks,
          status: (row.status as any) || 'PRESENT',
          enteredById: user.id,
        },
        update: {
          marksObtained: row.status === 'ABSENT' ? null : row.marksObtained,
          status: (row.status as any) || 'PRESENT',
          enteredById: user.id,
        },
      });
    }

    return { ok: true, saved: dto.rows.length };
  }

  /** FR-EXM-08: totals, grade, rank, pass/fail. Runs on demand before publishing. */
  async processResults(examId: string) {
    const marks = await this.prisma.mark.findMany({
      where: { examId },
      include: { subject: true },
    });
    if (!marks.length) throw new BadRequestException('No marks entered for this exam yet');

    const byStudent = new Map<string, typeof marks>();
    for (const m of marks) {
      const arr = byStudent.get(m.studentId) || [];
      arr.push(m);
      byStudent.set(m.studentId, arr);
    }

    const computed = Array.from(byStudent.entries()).map(([studentId, rows]) => {
      const total = rows.reduce((a, r) => a + (r.marksObtained || 0), 0);
      const maxTotal = rows.reduce((a, r) => a + r.maxMarks, 0);
      const percentage = maxTotal ? Math.round((total / maxTotal) * 1000) / 10 : 0;
      const failed = rows.some(
        (r) => r.status === 'ABSENT' || (r.marksObtained || 0) < r.subject.passMarks,
      );
      return { studentId, total, maxTotal, percentage, isPass: !failed, grade: gradeFor(percentage).grade };
    });

    computed.sort((a, b) => b.percentage - a.percentage);

    for (let i = 0; i < computed.length; i++) {
      const c = computed[i];
      await this.prisma.result.upsert({
        where: { examId_studentId: { examId, studentId: c.studentId } },
        create: { examId, studentId: c.studentId, ...c, rank: i + 1 },
        update: { ...c, rank: i + 1 },
      });
    }

    await this.prisma.exam.update({ where: { id: examId }, data: { status: 'LOCKED' } });
    await this.prisma.mark.updateMany({ where: { examId }, data: { isLocked: true } });

    return { processed: computed.length, topper: computed[0] };
  }

  async publish(examId: string) {
    return this.prisma.exam.update({
      where: { id: examId },
      data: { status: 'PUBLISHED', publishAt: new Date() },
    });
  }

  /** FR-EXM-12: result analysis for management. */
  async analysis(examId: string) {
    const [exam, results, marks] = await Promise.all([
      this.prisma.exam.findUnique({ where: { id: examId } }),
      this.prisma.result.findMany({
        where: { examId },
        include: {
          student: {
            include: {
              enrollments: { include: { section: { include: { classLevel: true } } }, take: 1, orderBy: { joinedOn: 'desc' } },
            },
          },
        },
        orderBy: { rank: 'asc' },
      }),
      this.prisma.mark.findMany({ where: { examId }, include: { subject: true } }),
    ]);

    const bySubject = new Map<string, { subject: string; total: number; pass: number; sum: number; max: number }>();
    for (const m of marks) {
      const cur = bySubject.get(m.subjectId) || { subject: m.subject.name, total: 0, pass: 0, sum: 0, max: 0 };
      cur.total++;
      if ((m.marksObtained || 0) >= m.subject.passMarks) cur.pass++;
      cur.sum += m.marksObtained || 0;
      cur.max = m.maxMarks;
      bySubject.set(m.subjectId, cur);
    }

    const gradeCount: Record<string, number> = {};
    for (const r of results) gradeCount[r.grade] = (gradeCount[r.grade] || 0) + 1;

    return {
      exam,
      appeared: results.length,
      passed: results.filter((r) => r.isPass).length,
      passPct: results.length ? Math.round((results.filter((r) => r.isPass).length / results.length) * 1000) / 10 : 0,
      average: results.length ? Math.round((results.reduce((a, r) => a + r.percentage, 0) / results.length) * 10) / 10 : 0,
      gradeDistribution: gradeCount,
      subjectWise: Array.from(bySubject.values()).map((s) => ({
        subject: s.subject,
        appeared: s.total,
        passPct: s.total ? Math.round((s.pass / s.total) * 1000) / 10 : 0,
        average: s.total ? Math.round((s.sum / s.total) * 10) / 10 : 0,
        maxMarks: s.max,
      })),
      toppers: results.slice(0, 5).map((r) => ({
        rank: r.rank,
        name: `${r.student.firstName} ${r.student.lastName}`,
        section: r.student.enrollments[0]
          ? `${r.student.enrollments[0].section.classLevel.name} ${r.student.enrollments[0].section.name}`
          : '',
        percentage: r.percentage,
        grade: r.grade,
      })),
      failures: results.filter((r) => !r.isPass).map((r) => ({
        name: `${r.student.firstName} ${r.student.lastName}`,
        percentage: r.percentage,
      })),
    };
  }

  /** Report card data for one student (FR-EXM-11). */
  async reportCard(examId: string, studentId: string) {
    const [result, marks, student, exam] = await Promise.all([
      this.prisma.result.findUnique({ where: { examId_studentId: { examId, studentId } } }),
      this.prisma.mark.findMany({ where: { examId, studentId }, include: { subject: true } }),
      this.prisma.student.findUnique({
        where: { id: studentId },
        include: { enrollments: { include: { section: { include: { classLevel: true, classTeacher: true } } } } },
      }),
      this.prisma.exam.findUnique({ where: { id: examId } }),
    ]);
    if (exam.status !== 'PUBLISHED') throw new BadRequestException('This result is not published yet');

    return {
      exam,
      student,
      enrollment: student.enrollments[0],
      result,
      subjects: marks.map((m) => ({
        subject: m.subject.name,
        marks: m.marksObtained,
        maxMarks: m.maxMarks,
        passMarks: m.subject.passMarks,
        status: m.status,
        isPass: (m.marksObtained || 0) >= m.subject.passMarks,
      })),
    };
  }

  /** What a student or parent sees. Nothing until the exam is published (BR-11). */
  async myResults(studentId: string) {
    const results = await this.prisma.result.findMany({
      where: { studentId, exam: { status: 'PUBLISHED' } },
      include: { exam: true },
      orderBy: { exam: { createdAt: 'desc' } },
    });

    const marks = await this.prisma.mark.findMany({
      where: { studentId, exam: { status: 'PUBLISHED' } },
      include: { subject: true, exam: true },
    });

    return results.map((r) => ({
      examId: r.examId,
      exam: r.exam.name,
      total: r.total,
      maxTotal: r.maxTotal,
      percentage: r.percentage,
      grade: r.grade,
      rank: r.rank,
      isPass: r.isPass,
      subjects: marks
        .filter((m) => m.examId === r.examId)
        .map((m) => ({
          subject: m.subject.name,
          marks: m.marksObtained,
          maxMarks: m.maxMarks,
          isPass: (m.marksObtained || 0) >= m.subject.passMarks,
        })),
    }));
  }
}
