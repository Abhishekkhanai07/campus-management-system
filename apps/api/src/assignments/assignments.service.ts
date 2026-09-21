import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicService } from '../academic/academic.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateAssignmentDto, EvaluateDto, MarkOfflineDto, SubmitDto } from './dto';

@Injectable()
export class AssignmentsService {
  constructor(private prisma: PrismaService, private academic: AcademicService) {}

  /** Creating an assignment immediately creates one PENDING row per student (FR-ASG-03/07). */
  async create(user: AuthUser, dto: CreateAssignmentDto) {
    const year = await this.academic.requireActiveYear();

    if (user.role === 'TEACHER') {
      const allowed = await this.prisma.teacherAllocation.findFirst({
        where: {
          staffId: user.staffId,
          sectionId: dto.sectionId,
          subjectId: dto.subjectId,
          academicYearId: year.id,
        },
      });
      if (!allowed) throw new ForbiddenException('You do not teach that subject in that section');
    }

    const assignment = await this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description,
        subjectId: dto.subjectId,
        sectionId: dto.sectionId,
        staffId: user.staffId,
        dueDate: new Date(dto.dueDate),
        maxMarks: dto.maxMarks ?? 10,
        attachmentUrl: dto.attachmentUrl,
      },
    });

    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId: dto.sectionId, academicYearId: year.id, status: 'ACTIVE' },
      select: { studentId: true },
    });

    await this.prisma.assignmentSubmission.createMany({
      data: enrollments.map((e) => ({ assignmentId: assignment.id, studentId: e.studentId })),
      skipDuplicates: true,
    });

    return { ...assignment, studentsAssigned: enrollments.length };
  }

  async list(user: AuthUser, query: { sectionId?: string; subjectId?: string }) {
    const year = await this.academic.requireActiveYear();

    if (user.role === 'STUDENT' || user.role === 'PARENT') {
      const studentId = user.role === 'STUDENT' ? user.studentId : user.guardianOfIds?.[0];
      const subs = await this.prisma.assignmentSubmission.findMany({
        where: { studentId },
        include: { assignment: { include: { subject: true, staff: true } } },
        orderBy: { assignment: { dueDate: 'desc' } },
      });
      return subs.map((s) => ({
        submissionId: s.id,
        id: s.assignmentId,
        title: s.assignment.title,
        description: s.assignment.description,
        subject: s.assignment.subject.name,
        teacher: `${s.assignment.staff.firstName} ${s.assignment.staff.lastName}`,
        dueDate: s.assignment.dueDate,
        maxMarks: s.assignment.maxMarks,
        status: s.status,
        isLate: s.isLate,
        marks: s.marks,
        remark: s.remark,
        submittedAt: s.submittedAt,
      }));
    }

    const where: any = { sectionId: query.sectionId, subjectId: query.subjectId };
    if (user.role === 'TEACHER') where.staffId = user.staffId;

    const rows = await this.prisma.assignment.findMany({
      where,
      include: {
        subject: true,
        section: { include: { classLevel: true } },
        staff: true,
        submissions: true,
      },
      orderBy: { dueDate: 'desc' },
    });

    return rows.map((a) => ({
      id: a.id,
      title: a.title,
      subject: a.subject.name,
      section: `${a.section.classLevel.name} ${a.section.name}`,
      teacher: `${a.staff.firstName} ${a.staff.lastName}`,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      total: a.submissions.length,
      submitted: a.submissions.filter((s) => s.status !== 'PENDING').length,
      pending: a.submissions.filter((s) => s.status === 'PENDING').length,
      late: a.submissions.filter((s) => s.isLate).length,
      evaluated: a.submissions.filter((s) => s.status === 'EVALUATED').length,
      isOverdue: a.dueDate < new Date(),
    }));
  }

  /** The "who has not submitted" screen the teacher lives in. */
  async detail(id: string) {
    const a = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        subject: true,
        section: { include: { classLevel: true } },
        staff: true,
        submissions: { include: { student: true }, orderBy: { student: { firstName: 'asc' } } },
      },
    });
    if (!a) throw new NotFoundException('Assignment not found');

    return {
      id: a.id,
      title: a.title,
      description: a.description,
      subject: a.subject.name,
      section: `${a.section.classLevel.name} ${a.section.name}`,
      dueDate: a.dueDate,
      maxMarks: a.maxMarks,
      stats: {
        total: a.submissions.length,
        submitted: a.submissions.filter((s) => s.status !== 'PENDING').length,
        pending: a.submissions.filter((s) => s.status === 'PENDING').length,
        late: a.submissions.filter((s) => s.isLate).length,
        evaluated: a.submissions.filter((s) => s.status === 'EVALUATED').length,
      },
      submissions: a.submissions.map((s) => ({
        id: s.id,
        studentId: s.studentId,
        name: `${s.student.firstName} ${s.student.lastName}`,
        admissionNo: s.student.admissionNo,
        status: s.status,
        isLate: s.isLate,
        submittedAt: s.submittedAt,
        content: s.content,
        fileUrl: s.fileUrl,
        marks: s.marks,
        remark: s.remark,
      })),
    };
  }

  /** FR-ASG-05: late flag + institute-level late policy. */
  async submit(user: AuthUser, assignmentId: string, dto: SubmitDto) {
    if (user.role !== 'STUDENT') throw new ForbiddenException('Only a student can submit');
    const inst = await this.academic.institute();
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const isLate = new Date() > assignment.dueDate;
    if (isLate && !inst.allowLateSubmission)
      throw new BadRequestException('The deadline has passed and late submission is not allowed');

    return this.prisma.assignmentSubmission.update({
      where: { assignmentId_studentId: { assignmentId, studentId: user.studentId } },
      data: {
        status: isLate ? 'LATE' : 'SUBMITTED',
        isLate,
        submittedAt: new Date(),
        content: dto.content,
        fileUrl: dto.fileUrl,
      },
    });
  }

  /** FR-ASG-06: paper submissions are ticked off by the teacher. */
  async markOffline(assignmentId: string, dto: MarkOfflineDto) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    return this.prisma.assignmentSubmission.update({
      where: { assignmentId_studentId: { assignmentId, studentId: dto.studentId } },
      data: {
        status: new Date() > assignment.dueDate ? 'LATE' : 'SUBMITTED',
        isLate: new Date() > assignment.dueDate,
        submittedAt: new Date(),
        remark: dto.remark || 'Submitted offline',
      },
    });
  }

  async evaluate(user: AuthUser, submissionId: string, dto: EvaluateDto) {
    const sub = await this.prisma.assignmentSubmission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!sub) throw new NotFoundException('Submission not found');
    if (dto.marks != null && dto.marks > sub.assignment.maxMarks)
      throw new BadRequestException(`Marks cannot be more than ${sub.assignment.maxMarks}`);

    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        marks: dto.marks,
        remark: dto.remark,
        status: (dto.status as any) || 'EVALUATED',
        evaluatedById: user.id,
        evaluatedAt: new Date(),
      },
    });
  }

  /** FR-ASG-12: compliance view for the admin. */
  async compliance() {
    const assignments = await this.prisma.assignment.findMany({
      include: { staff: true, subject: true, submissions: true, section: { include: { classLevel: true } } },
    });
    const byTeacher = new Map<string, { teacher: string; assignments: number; submissionRate: number; totalRows: number; submitted: number }>();
    for (const a of assignments) {
      const key = a.staffId;
      const cur = byTeacher.get(key) || {
        teacher: `${a.staff.firstName} ${a.staff.lastName}`,
        assignments: 0, submissionRate: 0, totalRows: 0, submitted: 0,
      };
      cur.assignments++;
      cur.totalRows += a.submissions.length;
      cur.submitted += a.submissions.filter((s) => s.status !== 'PENDING').length;
      byTeacher.set(key, cur);
    }
    return Array.from(byTeacher.entries()).map(([staffId, v]) => ({
      staffId,
      teacher: v.teacher,
      assignments: v.assignments,
      submissionRate: v.totalRows ? Math.round((v.submitted / v.totalRows) * 100) : 0,
    }));
  }
}
