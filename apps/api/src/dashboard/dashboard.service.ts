import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicService } from '../academic/academic.service';
import { AttendanceService } from '../attendance/attendance.service';
import { StaffService } from '../staff/staff.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { today, weekdayOf } from '../common/dates';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private academic: AcademicService,
    private attendance: AttendanceService,
    private staff: StaffService,
  ) {}

  async forUser(user: AuthUser) {
    switch (user.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return this.admin(user);
      case 'HOD':
        return this.admin(user);
      case 'TEACHER':
        return this.teacher(user);
      case 'STUDENT':
        return this.student(user.studentId);
      case 'PARENT':
        return this.parent(user);
      case 'ACCOUNTANT':
        return this.accountant();
      default:
        return this.office();
    }
  }

  // ---------------------------------------------------------------- admin
  private async admin(user: AuthUser) {
    const year = await this.academic.requireActiveYear();
    const date = today();

    const [
      students, staffCount, sections, attendanceToday, notMarked, subsToday,
      pendingLeaves, pendingCorrections, noCT, feeSummary, recentActivity, defaulters,
    ] = await Promise.all([
      this.prisma.enrollment.count({ where: { academicYearId: year.id, status: 'ACTIVE' } }),
      this.prisma.staff.count({ where: { isActive: true } }),
      this.prisma.section.count({ where: { academicYearId: year.id } }),
      this.attendance.todaySummary(),
      this.attendance.notMarked(),
      this.prisma.substitution.findMany({
        where: { date },
        include: { absentStaff: true, substituteStaff: true },
      }),
      this.prisma.leaveApplication.count({ where: { status: 'PENDING' } }),
      this.prisma.attendanceCorrection.count({ where: { status: 'PENDING' } }),
      this.academic.sectionsWithoutClassTeacher(),
      this.prisma.feePayment.findMany({
        where: { isCancelled: false, paidAt: { gte: date } },
      }),
      this.prisma.auditLog.findMany({ take: 8, orderBy: { createdAt: 'desc' } }),
      this.attendance.defaulters(),
    ]);

    return {
      role: user.role,
      academicYear: year.name,
      cards: {
        students,
        staff: staffCount,
        sections,
        attendancePct: attendanceToday.pct,
        presentToday: attendanceToday.present,
        absentToday: attendanceToday.absent,
      },
      attendanceToday,
      feeToday: {
        count: feeSummary.length,
        amount: feeSummary.reduce((a, p) => a + p.amount, 0),
      },
      substitutions: {
        total: subsToday.length,
        needsCover: subsToday.filter((s) => s.status === 'NEEDS_COVER').length,
        covered: subsToday.filter((s) => ['ASSIGNED', 'CONDUCTED'].includes(s.status)).length,
        teachersAbsent: new Set(subsToday.map((s) => s.absentStaffId)).size,
      },
      needsAttention: {
        periodsNotMarked: notMarked.rows.length,
        pendingLeaveApprovals: pendingLeaves,
        pendingCorrections,
        sectionsWithoutClassTeacher: noCT.length,
        attendanceDefaulters: defaulters.count,
      },
      recentActivity: recentActivity.map((a) => ({
        who: a.actorName,
        role: a.role,
        action: a.action,
        module: a.module,
        at: a.createdAt,
      })),
    };
  }

  // ---------------------------------------------------------------- teacher
  private async teacher(user: AuthUser) {
    const teaching = await this.staff.myTeaching(user.staffId);
    const date = today();

    const [duties, markedSlots, assignments, leaveBalances, pendingStudentLeaves] = await Promise.all([
      this.prisma.substitution.findMany({
        where: { substituteStaffId: user.staffId, date, status: { in: ['ASSIGNED', 'CONDUCTED'] } },
        include: { slot: { include: { subject: true, section: { include: { classLevel: true } } } } },
      }),
      this.prisma.periodAttendance.findMany({
        where: { date, markedById: user.id },
        select: { slotId: true },
        distinct: ['slotId'],
      }),
      this.prisma.assignment.findMany({
        where: { staffId: user.staffId },
        include: { submissions: true },
      }),
      this.prisma.leaveBalance.findMany({
        where: { staffId: user.staffId, year: new Date().getFullYear() },
        include: { leaveType: true },
      }),
      this.prisma.studentLeave.count({
        where: {
          status: 'PENDING',
          student: { enrollments: { some: { sectionId: { in: user.classTeacherOfSectionIds || [] } } } },
        },
      }),
    ]);

    const markedIds = new Set(markedSlots.map((m) => m.slotId));
    const pendingEvaluation = assignments.reduce(
      (a, x) => a + x.submissions.filter((s) => ['SUBMITTED', 'LATE'].includes(s.status)).length,
      0,
    );

    return {
      role: 'TEACHER',
      name: user.name,
      cards: {
        subjects: new Set(teaching.allocations.map((a) => a.subject)).size,
        sections: teaching.allocations.length,
        students: teaching.totalStudents,
        periodsToday: teaching.todaySlots.length,
      },
      classTeacherOf: teaching.classTeacherOf,
      todaySlots: teaching.todaySlots.map((s) => ({ ...s, attendanceMarked: markedIds.has(s.id) })),
      substitutionDuties: duties.map((d) => ({
        id: d.id,
        periodNo: d.slot.periodNo,
        time: `${d.slot.startTime}-${d.slot.endTime}`,
        subject: d.slot.subject.name,
        section: `${d.slot.section.classLevel.name} ${d.slot.section.name}`,
        slotId: d.slotId,
      })),
      needsAttention: {
        attendancePending: teaching.todaySlots.length - teaching.todaySlots.filter((s) => markedIds.has(s.id)).length,
        assignmentsToEvaluate: pendingEvaluation,
        studentLeaveRequests: pendingStudentLeaves,
      },
      leaveBalances: leaveBalances.map((b) => ({
        type: b.leaveType.name,
        remaining: b.opening - b.availed,
        total: b.opening,
      })),
    };
  }

  // ---------------------------------------------------------------- student / parent
  async student(studentId: string) {
    const year = await this.academic.requireActiveYear();
    const att = await this.attendance.myAttendance(studentId);

    const [enrollment, submissions, results, fees, notices] = await Promise.all([
      this.prisma.enrollment.findFirst({
        where: { studentId, academicYearId: year.id },
        include: { section: { include: { classLevel: true, classTeacher: true } } },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { studentId, status: 'PENDING' },
        include: { assignment: { include: { subject: true } } },
        orderBy: { assignment: { dueDate: 'asc' } },
        take: 5,
      }),
      this.prisma.result.findMany({
        where: { studentId, exam: { status: 'PUBLISHED' } },
        include: { exam: true },
        orderBy: { exam: { createdAt: 'desc' } },
        take: 1,
      }),
      this.prisma.studentFee.findMany({
        where: { studentId },
        include: { payments: { where: { isCancelled: false } } },
      }),
      this.prisma.notice.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const totalFee = fees.reduce((a, f) => a + f.netPayable, 0);
    const paidFee = fees.reduce((a, f) => a + f.payments.reduce((s, p) => s + p.amount, 0), 0);

    const wd = weekdayOf(today());
    const slots = enrollment
      ? await this.prisma.timetableSlot.findMany({
          where: { sectionId: enrollment.sectionId, weekday: wd },
          include: { subject: true, staff: true },
          orderBy: { periodNo: 'asc' },
        })
      : [];

    const subs = enrollment
      ? await this.prisma.substitution.findMany({
          where: { date: today(), slot: { sectionId: enrollment.sectionId }, status: 'ASSIGNED' },
          include: { substituteStaff: true },
        })
      : [];

    return {
      role: 'STUDENT',
      section: enrollment ? `${enrollment.section.classLevel.name} ${enrollment.section.name}` : null,
      classTeacher: enrollment?.section.classTeacher
        ? `${enrollment.section.classTeacher.firstName} ${enrollment.section.classTeacher.lastName}`
        : null,
      attendance: {
        pct: att.overallPct,
        minRequired: att.minRequired,
        isDefaulter: att.overallPct < att.minRequired && att.totalDays > 0,
        bySubject: att.bySubject,
      },
      timetableToday: slots.map((s) => {
        const sub = subs.find((x) => x.slotId === s.id);
        return {
          periodNo: s.periodNo,
          time: `${s.startTime}-${s.endTime}`,
          subject: s.subject.name,
          teacher: sub?.substituteStaff
            ? `${sub.substituteStaff.firstName} ${sub.substituteStaff.lastName} (substitute)`
            : `${s.staff.firstName} ${s.staff.lastName}`,
          isSubstituted: !!sub,
        };
      }),
      pendingAssignments: submissions.map((s) => ({
        id: s.assignmentId,
        title: s.assignment.title,
        subject: s.assignment.subject.name,
        dueDate: s.assignment.dueDate,
        isOverdue: s.assignment.dueDate < new Date(),
      })),
      lastResult: results[0]
        ? {
            exam: results[0].exam.name,
            percentage: results[0].percentage,
            grade: results[0].grade,
            rank: results[0].rank,
          }
        : null,
      fees: { total: totalFee, paid: paidFee, balance: Math.round((totalFee - paidFee) * 100) / 100 },
      notices,
    };
  }

  private async parent(user: AuthUser) {
    const wards = await this.prisma.student.findMany({
      where: { id: { in: user.guardianOfIds || [] } },
    });
    const children = [];
    for (const w of wards) {
      const data = await this.student(w.id);
      children.push({ studentId: w.id, name: `${w.firstName} ${w.lastName}`, ...data });
    }
    return { role: 'PARENT', children };
  }

  // ---------------------------------------------------------------- accountant / office
  private async accountant() {
    const date = today();
    const [todayPayments, monthPayments, dues] = await Promise.all([
      this.prisma.feePayment.findMany({ where: { isCancelled: false, paidAt: { gte: date } } }),
      this.prisma.feePayment.findMany({
        where: {
          isCancelled: false,
          paidAt: { gte: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)) },
        },
      }),
      this.prisma.studentFee.findMany({ include: { payments: { where: { isCancelled: false } } } }),
    ]);

    const pending = dues.reduce(
      (a, f) => a + Math.max(f.netPayable - f.payments.reduce((s, p) => s + p.amount, 0), 0),
      0,
    );

    return {
      role: 'ACCOUNTANT',
      cards: {
        collectedToday: todayPayments.reduce((a, p) => a + p.amount, 0),
        receiptsToday: todayPayments.length,
        collectedThisMonth: monthPayments.reduce((a, p) => a + p.amount, 0),
        pendingDues: Math.round(pending * 100) / 100,
      },
      recentReceipts: todayPayments.slice(-10).reverse(),
    };
  }

  private async office() {
    const year = await this.academic.requireActiveYear();
    const students = await this.prisma.enrollment.count({
      where: { academicYearId: year.id, status: 'ACTIVE' },
    });
    return { role: 'OFFICE', cards: { students } };
  }
}
