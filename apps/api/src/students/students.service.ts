import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicService } from '../academic/academic.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateStudentDto, ExitStudentDto, StudentLeaveDto, TransferSectionDto } from './dto';
import { isoDate, pct, toDateOnly } from '../common/dates';

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService, private academic: AcademicService) {}

  // ---------------------------------------------------------------- scope
  /**
   * SRS BR-18: a user can never read outside their scope.
   * Students see themselves, parents see their wards, teachers see the students they teach.
   */
  async assertCanRead(user: AuthUser, studentId: string) {
    if (['SUPER_ADMIN', 'ADMIN', 'OFFICE', 'ACCOUNTANT', 'HOD'].includes(user.role)) return;
    if (user.role === 'STUDENT' && user.studentId === studentId) return;
    if (user.role === 'PARENT' && user.guardianOfIds?.includes(studentId)) return;
    if (user.role === 'TEACHER') {
      const year = await this.academic.requireActiveYear();
      const enrollment = await this.prisma.enrollment.findFirst({
        where: { studentId, academicYearId: year.id, status: 'ACTIVE' },
      });
      if (!enrollment) throw new ForbiddenException('That student is not in your classes');
      const teaches = await this.prisma.teacherAllocation.findFirst({
        where: { staffId: user.staffId, sectionId: enrollment.sectionId, academicYearId: year.id },
      });
      const isClassTeacher = user.classTeacherOfSectionIds?.includes(enrollment.sectionId);
      if (teaches || isClassTeacher) return;
    }
    throw new ForbiddenException('You do not have access to this student');
  }

  /** Section IDs the user is allowed to work with. undefined = all sections. */
  async visibleSectionIds(user: AuthUser): Promise<string[] | undefined> {
    if (['SUPER_ADMIN', 'ADMIN', 'OFFICE', 'ACCOUNTANT'].includes(user.role)) return undefined;
    if (user.role === 'TEACHER' || user.role === 'HOD') {
      const year = await this.academic.requireActiveYear();
      const allocs = await this.prisma.teacherAllocation.findMany({
        where: { staffId: user.staffId, academicYearId: year.id },
        select: { sectionId: true },
      });
      return Array.from(new Set([...allocs.map((a) => a.sectionId), ...(user.classTeacherOfSectionIds || [])]));
    }
    return [];
  }

  // ---------------------------------------------------------------- list & create
  async list(user: AuthUser, query: { sectionId?: string; q?: string; status?: string }) {
    const year = await this.academic.requireActiveYear();
    const allowed = await this.visibleSectionIds(user);

    if (user.role === 'STUDENT') {
      return this.prisma.student.findMany({
        where: { id: user.studentId },
        include: { enrollments: { where: { academicYearId: year.id }, include: { section: { include: { classLevel: true } } } } },
      });
    }
    if (user.role === 'PARENT') {
      return this.prisma.student.findMany({
        where: { id: { in: user.guardianOfIds || [] } },
        include: { enrollments: { where: { academicYearId: year.id }, include: { section: { include: { classLevel: true } } } } },
      });
    }

    const sectionFilter = query.sectionId
      ? { sectionId: query.sectionId }
      : allowed
      ? { sectionId: { in: allowed } }
      : {};

    return this.prisma.student.findMany({
      where: {
        isActive: query.status === 'INACTIVE' ? false : true,
        enrollments: { some: { academicYearId: year.id, status: 'ACTIVE', ...sectionFilter } },
        ...(query.q
          ? {
              OR: [
                { firstName: { contains: query.q, mode: 'insensitive' as const } },
                { lastName: { contains: query.q, mode: 'insensitive' as const } },
                { admissionNo: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        enrollments: {
          where: { academicYearId: year.id },
          include: { section: { include: { classLevel: true } } },
        },
        guardians: { where: { isPrimary: true } },
      },
      orderBy: [{ firstName: 'asc' }],
      take: 500,
    });
  }

  /** FR-STU-07: capacity check; FR-STU-09: login created and returned once. */
  async create(dto: CreateStudentDto) {
    const year = await this.academic.requireActiveYear();
    const section = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
      include: { classLevel: true, _count: { select: { enrollments: true } } },
    });
    if (!section) throw new NotFoundException('Section not found');
    if (section._count.enrollments >= section.capacity) {
      throw new BadRequestException(
        `${section.classLevel.name} ${section.name} is full (${section.capacity} seats). Choose another section.`,
      );
    }

    const count = await this.prisma.student.count();
    const admissionNo = `ADM${new Date().getFullYear()}${String(count + 1).padStart(4, '0')}`;
    const tempPassword = `Camp${Math.floor(1000 + Math.random() * 9000)}!`;

    const student = await this.prisma.student.create({
      data: {
        admissionNo,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dob: dto.dob ? toDateOnly(dto.dob) : undefined,
        gender: dto.gender,
        bloodGroup: dto.bloodGroup,
        category: dto.category,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        user: {
          create: {
            loginId: admissionNo,
            email: dto.email,
            phone: dto.phone,
            role: 'STUDENT',
            passwordHash: await bcrypt.hash(tempPassword, 10),
          },
        },
        enrollments: {
          create: {
            sectionId: dto.sectionId,
            academicYearId: year.id,
            rollNo: dto.rollNo ?? section._count.enrollments + 1,
          },
        },
        guardians: dto.guardianName
          ? {
              create: {
                name: dto.guardianName,
                relation: dto.guardianRelation || 'FATHER',
                phone: dto.guardianPhone,
                email: dto.guardianEmail,
                isPrimary: true,
              },
            }
          : undefined,
      },
      include: { enrollments: true, guardians: true },
    });

    return { ...student, credentials: { loginId: admissionNo, tempPassword } };
  }

  // ---------------------------------------------------------------- 360 profile
  async profile(user: AuthUser, id: string) {
    await this.assertCanRead(user, id);
    const year = await this.academic.requireActiveYear();
    const inst = await this.academic.institute();

    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        guardians: true,
        enrollments: {
          where: { academicYearId: year.id },
          include: { section: { include: { classLevel: true, classTeacher: true } } },
        },
      },
    });
    if (!student) throw new NotFoundException('Student not found');

    const [daily, period, submissions, marks, fees, leaves] = await Promise.all([
      this.prisma.dailyAttendance.findMany({ where: { studentId: id }, orderBy: { date: 'desc' } }),
      this.prisma.periodAttendance.findMany({
        where: { studentId: id },
        include: { subject: true },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { studentId: id },
        include: { assignment: { include: { subject: true } } },
        orderBy: { assignment: { dueDate: 'desc' } },
      }),
      this.prisma.mark.findMany({
        where: { studentId: id },
        include: { subject: true, exam: true },
      }),
      this.prisma.studentFee.findMany({
        where: { studentId: id },
        include: { feeStructure: true, installments: true, payments: { where: { isCancelled: false } } },
      }),
      this.prisma.studentLeave.findMany({ where: { studentId: id }, orderBy: { fromDate: 'desc' } }),
    ]);

    const presentDays = daily.filter((d) => ['PRESENT', 'LATE', 'ON_DUTY'].includes(d.status)).length;
    const leaveDays = daily.filter((d) => d.status === 'ON_LEAVE').length;
    const countedTotal = inst.leaveCountsAsPresent ? daily.length : daily.length - leaveDays;
    const countedPresent = inst.leaveCountsAsPresent ? presentDays + leaveDays : presentDays;

    // subject-wise attendance
    const bySubject: Record<string, { subject: string; held: number; present: number }> = {};
    for (const p of period) {
      const key = p.subjectId;
      bySubject[key] ||= { subject: p.subject.name, held: 0, present: 0 };
      bySubject[key].held += 1;
      if (['PRESENT', 'LATE', 'ON_DUTY'].includes(p.status)) bySubject[key].present += 1;
    }

    const feeTotal = fees.reduce((s, f) => s + f.netPayable, 0);
    const feePaid = fees.reduce((s, f) => s + f.payments.reduce((a, p) => a + p.amount, 0), 0);

    return {
      student,
      enrollment: student.enrollments[0] || null,
      attendance: {
        overallPct: pct(countedPresent, countedTotal),
        presentDays,
        absentDays: daily.filter((d) => d.status === 'ABSENT').length,
        leaveDays,
        totalDays: daily.length,
        minRequired: inst.minAttendancePct,
        isDefaulter: pct(countedPresent, countedTotal) < inst.minAttendancePct && daily.length > 0,
        recent: daily.slice(0, 60).map((d) => ({ date: isoDate(d.date), status: d.status })),
        bySubject: Object.values(bySubject).map((s) => ({ ...s, pct: pct(s.present, s.held) })),
      },
      assignments: {
        total: submissions.length,
        submitted: submissions.filter((s) => s.status !== 'PENDING').length,
        pending: submissions.filter((s) => s.status === 'PENDING').length,
        late: submissions.filter((s) => s.isLate).length,
        items: submissions.map((s) => ({
          id: s.id,
          title: s.assignment.title,
          subject: s.assignment.subject.name,
          dueDate: s.assignment.dueDate,
          status: s.status,
          isLate: s.isLate,
          marks: s.marks,
          maxMarks: s.assignment.maxMarks,
          submittedAt: s.submittedAt,
        })),
      },
      exams: marks.map((m) => ({
        exam: m.exam.name,
        examStatus: m.exam.status,
        subject: m.subject.name,
        marks: m.exam.status === 'PUBLISHED' ? m.marksObtained : null,
        maxMarks: m.maxMarks,
        status: m.status,
      })),
      fees: {
        total: feeTotal,
        paid: feePaid,
        balance: Math.round((feeTotal - feePaid) * 100) / 100,
        structures: fees,
      },
      leaves,
    };
  }

  // ---------------------------------------------------------------- moves
  async transfer(id: string, dto: TransferSectionDto) {
    const year = await this.academic.requireActiveYear();
    const target = await this.prisma.section.findUnique({
      where: { id: dto.sectionId },
      include: { classLevel: true, _count: { select: { enrollments: true } } },
    });
    if (target._count.enrollments >= target.capacity)
      throw new BadRequestException('Target section is already full');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId: id, academicYearId: year.id },
    });
    if (!enrollment) throw new NotFoundException('No active enrollment for this student');

    return this.prisma.enrollment.update({
      where: { id: enrollment.id },
      data: { sectionId: dto.sectionId },
    });
  }

  async exit(id: string, dto: ExitStudentDto) {
    const year = await this.academic.requireActiveYear();
    await this.prisma.enrollment.updateMany({
      where: { studentId: id, academicYearId: year.id },
      data: { status: 'TRANSFERRED', leftOn: new Date() },
    });
    const student = await this.prisma.student.update({
      where: { id },
      data: {
        isActive: false,
        exitDate: dto.exitDate ? toDateOnly(dto.exitDate) : new Date(),
        exitReason: dto.reason,
      },
    });
    if (student.userId) {
      await this.prisma.user.update({ where: { id: student.userId }, data: { isActive: false } });
    }
    return student;
  }

  // ---------------------------------------------------------------- class strength
  async strength() {
    const year = await this.academic.requireActiveYear();
    const sections = await this.prisma.section.findMany({
      where: { academicYearId: year.id },
      include: {
        classLevel: true,
        classTeacher: true,
        enrollments: { where: { status: 'ACTIVE' }, include: { student: true } },
      },
      orderBy: [{ classLevel: { displayOrder: 'asc' } }, { name: 'asc' }],
    });

    const rows = sections.map((s) => {
      const male = s.enrollments.filter((e) => e.student.gender === 'MALE').length;
      const female = s.enrollments.filter((e) => e.student.gender === 'FEMALE').length;
      return {
        sectionId: s.id,
        class: s.classLevel.name,
        section: s.name,
        classTeacher: s.classTeacher ? `${s.classTeacher.firstName} ${s.classTeacher.lastName}` : null,
        strength: s.enrollments.length,
        capacity: s.capacity,
        vacant: s.capacity - s.enrollments.length,
        male,
        female,
        isFull: s.enrollments.length >= s.capacity,
      };
    });

    return {
      rows,
      totals: {
        students: rows.reduce((a, r) => a + r.strength, 0),
        capacity: rows.reduce((a, r) => a + r.capacity, 0),
        sections: rows.length,
      },
    };
  }

  // ---------------------------------------------------------------- student leave
  async applyLeave(user: AuthUser, dto: StudentLeaveDto) {
    const studentId =
      user.role === 'STUDENT' ? user.studentId : dto.studentId || user.guardianOfIds?.[0];
    if (!studentId) throw new BadRequestException('Which student is this leave for?');
    await this.assertCanRead(user, studentId);
    return this.prisma.studentLeave.create({
      data: {
        studentId,
        fromDate: toDateOnly(dto.fromDate),
        toDate: toDateOnly(dto.toDate),
        reason: dto.reason,
      },
    });
  }

  async pendingLeaves(user: AuthUser) {
    const year = await this.academic.requireActiveYear();
    const sectionIds = user.classTeacherOfSectionIds || [];
    const where =
      ['SUPER_ADMIN', 'ADMIN'].includes(user.role)
        ? { status: 'PENDING' as const }
        : {
            status: 'PENDING' as const,
            student: {
              enrollments: { some: { sectionId: { in: sectionIds }, academicYearId: year.id } },
            },
          };
    return this.prisma.studentLeave.findMany({
      where,
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decideLeave(user: AuthUser, id: string, approve: boolean, remark?: string) {
    const leave = await this.prisma.studentLeave.update({
      where: { id },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        decidedById: user.id,
        remark,
      },
    });

    // Approved leave overwrites the attendance days as ON_LEAVE (SRS BR-06)
    if (approve) {
      const days: Date[] = [];
      const cur = toDateOnly(leave.fromDate);
      const end = toDateOnly(leave.toDate);
      while (cur <= end) {
        days.push(new Date(cur));
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
      for (const d of days) {
        await this.prisma.dailyAttendance.upsert({
          where: { studentId_date: { studentId: leave.studentId, date: d } },
          create: { studentId: leave.studentId, date: d, status: 'ON_LEAVE', markedById: user.id },
          update: { status: 'ON_LEAVE' },
        });
      }
    }
    return leave;
  }
}
