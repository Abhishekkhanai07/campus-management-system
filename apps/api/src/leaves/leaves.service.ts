import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicService } from '../academic/academic.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { ApplyLeaveDto, AssignSubstituteDto, DecideLeaveDto } from './dto';
import { eachDate, isoDate, toDateOnly, today, weekdayOf } from '../common/dates';

@Injectable()
export class LeavesService {
  constructor(private prisma: PrismaService, private academic: AcademicService) {}

  types() {
    return this.prisma.leaveType.findMany({ orderBy: { name: 'asc' } });
  }

  async balances(staffId: string) {
    return this.prisma.leaveBalance.findMany({
      where: { staffId, year: new Date().getFullYear() },
      include: { leaveType: true },
    });
  }

  // ---------------------------------------------------------------- apply
  async apply(user: AuthUser, dto: ApplyLeaveDto) {
    const staffId =
      ['SUPER_ADMIN', 'ADMIN'].includes(user.role) && dto.staffId ? dto.staffId : user.staffId;
    if (!staffId) throw new BadRequestException('This login is not linked to a staff record');

    const from = toDateOnly(dto.fromDate);
    const to = toDateOnly(dto.toDate);
    if (to < from) throw new BadRequestException('The end date cannot be before the start date');

    // BR-08: teachers cannot back-date their own leave; admins can, on behalf of staff
    if (from < today() && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
      throw new BadRequestException(
        'Leave cannot be applied for a past date. Ask the office to record it for you.',
      );
    }

    const days = dto.isHalfDay ? 0.5 : eachDate(from, to).filter((d) => weekdayOf(d) !== 7).length;

    const balance = await this.prisma.leaveBalance.findFirst({
      where: { staffId, leaveTypeId: dto.leaveTypeId, year: new Date().getFullYear() },
      include: { leaveType: true },
    });
    if (balance && balance.leaveType.isPaid && balance.opening - balance.availed < days) {
      throw new BadRequestException(
        `Only ${balance.opening - balance.availed} day(s) of ${balance.leaveType.name} left. Apply as loss of pay instead.`,
      );
    }

    const application = await this.prisma.leaveApplication.create({
      data: {
        staffId,
        leaveTypeId: dto.leaveTypeId,
        fromDate: from,
        toDate: to,
        isHalfDay: dto.isHalfDay || false,
        reason: dto.reason,
      },
      include: { leaveType: true, staff: true },
    });

    const impact = await this.impactedPeriods(staffId, from, to);
    return { ...application, days, impact };
  }

  /** FR-LV-04: the approver sees exactly which periods will be uncovered. */
  async impactedPeriods(staffId: string, from: Date, to: Date) {
    const dates = eachDate(from, to).filter((d) => weekdayOf(d) !== 7);
    const slots = await this.prisma.timetableSlot.findMany({
      where: { staffId },
      include: { subject: true, section: { include: { classLevel: true, _count: { select: { enrollments: true } } } } },
    });

    const rows = [];
    for (const d of dates) {
      const wd = weekdayOf(d);
      for (const s of slots.filter((s) => s.weekday === wd)) {
        rows.push({
          date: isoDate(d),
          slotId: s.id,
          periodNo: s.periodNo,
          time: `${s.startTime}-${s.endTime}`,
          subject: s.subject.name,
          section: `${s.section.classLevel.name} ${s.section.name}`,
          students: s.section._count.enrollments,
        });
      }
    }
    return {
      periods: rows.length,
      studentsAffected: rows.reduce((a, r) => a + r.students, 0),
      rows,
    };
  }

  async myApplications(staffId: string) {
    return this.prisma.leaveApplication.findMany({
      where: { staffId },
      include: { leaveType: true, substitutions: { include: { substituteStaff: true, slot: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async pending(user: AuthUser) {
    if (!['SUPER_ADMIN', 'ADMIN', 'HOD'].includes(user.role))
      throw new ForbiddenException('Only an approver can see this list');

    const apps = await this.prisma.leaveApplication.findMany({
      where: { status: 'PENDING' },
      include: { leaveType: true, staff: { include: { department: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return Promise.all(
      apps.map(async (a) => ({
        ...a,
        impact: await this.impactedPeriods(a.staffId, a.fromDate, a.toDate),
      })),
    );
  }

  // ---------------------------------------------------------------- decide + generate substitutions
  async decide(user: AuthUser, id: string, dto: DecideLeaveDto) {
    const app = await this.prisma.leaveApplication.findUnique({
      where: { id },
      include: { leaveType: true },
    });
    if (!app) throw new NotFoundException('Leave application not found');
    if (app.status !== 'PENDING') throw new BadRequestException('This application is already decided');

    const updated = await this.prisma.leaveApplication.update({
      where: { id },
      data: {
        status: dto.approve ? 'APPROVED' : 'REJECTED',
        decidedById: user.id,
        decisionRemark: dto.remark,
        decidedAt: new Date(),
      },
    });

    if (!dto.approve) return { application: updated, substitutionsCreated: 0 };

    // deduct balance
    const days = app.isHalfDay ? 0.5 : eachDate(app.fromDate, app.toDate).filter((d) => weekdayOf(d) !== 7).length;
    await this.prisma.leaveBalance.updateMany({
      where: { staffId: app.staffId, leaveTypeId: app.leaveTypeId, year: new Date().getFullYear() },
      data: { availed: { increment: days } },
    });

    // FR-SUB-01: every affected period becomes a "needs cover" row
    const impact = await this.impactedPeriods(app.staffId, app.fromDate, app.toDate);
    let created = 0;
    for (const row of impact.rows) {
      const existing = await this.prisma.substitution.findFirst({
        where: { slotId: row.slotId, date: toDateOnly(row.date) },
      });
      if (existing) continue;
      await this.prisma.substitution.create({
        data: {
          date: toDateOnly(row.date),
          slotId: row.slotId,
          absentStaffId: app.staffId,
          leaveApplicationId: app.id,
        },
      });
      created++;
    }

    return { application: updated, substitutionsCreated: created, impact };
  }

  // ---------------------------------------------------------------- substitution board
  async board(dateStr?: string) {
    const date = dateStr ? toDateOnly(dateStr) : today();
    const rows = await this.prisma.substitution.findMany({
      where: { date },
      include: {
        absentStaff: true,
        substituteStaff: true,
        slot: {
          include: { subject: true, section: { include: { classLevel: true, _count: { select: { enrollments: true } } } } },
        },
      },
      orderBy: { slot: { periodNo: 'asc' } },
    });

    return {
      date: isoDate(date),
      summary: {
        total: rows.length,
        covered: rows.filter((r) => ['ASSIGNED', 'CONDUCTED'].includes(r.status)).length,
        needsCover: rows.filter((r) => r.status === 'NEEDS_COVER').length,
      },
      rows: rows.map((r) => ({
        id: r.id,
        periodNo: r.slot.periodNo,
        time: `${r.slot.startTime}-${r.slot.endTime}`,
        subject: r.slot.subject.name,
        subjectId: r.slot.subjectId,
        section: `${r.slot.section.classLevel.name} ${r.slot.section.name}`,
        students: r.slot.section._count.enrollments,
        absentTeacher: `${r.absentStaff.firstName} ${r.absentStaff.lastName}`,
        substitute: r.substituteStaff ? `${r.substituteStaff.firstName} ${r.substituteStaff.lastName}` : null,
        status: r.status,
        slotId: r.slotId,
        note: r.note,
      })),
    };
  }

  /**
   * FR-SUB-02: ranked suggestions.
   * free that period > teaches the same subject > same department > lowest substitution load.
   */
  async suggestions(substitutionId: string) {
    const sub = await this.prisma.substitution.findUnique({
      where: { id: substitutionId },
      include: { slot: { include: { subject: true, section: true } } },
    });
    if (!sub) throw new NotFoundException('Substitution row not found');

    const wd = weekdayOf(sub.date);
    const [staff, busySlots, leavesToday, subLoad] = await Promise.all([
      this.prisma.staff.findMany({
        where: { isActive: true, isTeaching: true, id: { not: sub.absentStaffId } },
        include: { department: true, allocations: { include: { subject: true } } },
      }),
      this.prisma.timetableSlot.findMany({
        where: { weekday: wd, periodNo: sub.slot.periodNo },
        select: { staffId: true },
      }),
      this.prisma.leaveApplication.findMany({
        where: { status: 'APPROVED', fromDate: { lte: sub.date }, toDate: { gte: sub.date } },
        select: { staffId: true },
      }),
      this.prisma.substitution.groupBy({
        by: ['substituteStaffId'],
        where: {
          status: { in: ['ASSIGNED', 'CONDUCTED'] },
          date: { gte: new Date(sub.date.getTime() - 7 * 86400000) },
        },
        _count: { _all: true },
      }),
    ]);

    const busy = new Set(busySlots.map((s) => s.staffId));
    const onLeave = new Set(leavesToday.map((l) => l.staffId));
    const loadMap = new Map(subLoad.map((s) => [s.substituteStaffId, s._count._all]));

    // teachers already assigned to another substitution in the same period
    const clashSubs = await this.prisma.substitution.findMany({
      where: { date: sub.date, status: 'ASSIGNED', slot: { periodNo: sub.slot.periodNo } },
      select: { substituteStaffId: true },
    });
    const clashing = new Set(clashSubs.map((c) => c.substituteStaffId));

    const candidates = staff
      .filter((s) => !busy.has(s.id) && !onLeave.has(s.id) && !clashing.has(s.id))
      .map((s) => {
        const teachesSubject = s.allocations.some((a) => a.subjectId === sub.slot.subjectId);
        const sameDept = s.departmentId && s.departmentId === sub.slot.subject.departmentId;
        const load = loadMap.get(s.id) || 0;
        const score = (teachesSubject ? 100 : 0) + (sameDept ? 40 : 0) - load * 5;
        return {
          staffId: s.id,
          name: `${s.firstName} ${s.lastName}`,
          department: s.department?.name,
          teachesSubject,
          sameDepartment: !!sameDept,
          substitutionsLast7Days: load,
          score,
          reason: teachesSubject
            ? 'Teaches this subject and is free this period'
            : sameDept
            ? 'Same department and free this period'
            : 'Free this period',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return { substitutionId, period: sub.slot.periodNo, date: isoDate(sub.date), candidates };
  }

  /** FR-SUB-03: never assign a teacher who is busy or on leave. */
  async assign(id: string, dto: AssignSubstituteDto) {
    const sub = await this.prisma.substitution.findUnique({
      where: { id },
      include: { slot: true },
    });
    if (!sub) throw new NotFoundException('Substitution row not found');

    if (dto.status && dto.status !== 'ASSIGNED') {
      return this.prisma.substitution.update({
        where: { id },
        data: { status: dto.status as any, note: dto.note, substituteStaffId: null },
      });
    }

    if (!dto.substituteStaffId) throw new BadRequestException('Choose a substitute teacher');

    const wd = weekdayOf(sub.date);
    const busy = await this.prisma.timetableSlot.findFirst({
      where: { staffId: dto.substituteStaffId, weekday: wd, periodNo: sub.slot.periodNo },
    });
    if (busy) throw new BadRequestException('That teacher already has a class in this period');

    const onLeave = await this.prisma.leaveApplication.findFirst({
      where: {
        staffId: dto.substituteStaffId,
        status: 'APPROVED',
        fromDate: { lte: sub.date },
        toDate: { gte: sub.date },
      },
    });
    if (onLeave) throw new BadRequestException('That teacher is on leave on this date');

    return this.prisma.substitution.update({
      where: { id },
      data: { substituteStaffId: dto.substituteStaffId, status: 'ASSIGNED', note: dto.note },
      include: { substituteStaff: true },
    });
  }

  /** What a teacher sees: "you are covering these periods". */
  async myDuties(staffId: string, dateStr?: string) {
    const date = dateStr ? toDateOnly(dateStr) : today();
    return this.prisma.substitution.findMany({
      where: { substituteStaffId: staffId, date, status: { in: ['ASSIGNED', 'CONDUCTED'] } },
      include: {
        absentStaff: true,
        slot: { include: { subject: true, section: { include: { classLevel: true } } } },
      },
      orderBy: { slot: { periodNo: 'asc' } },
    });
  }

  /** FR-SUB-08: substitution load per teacher, for honorarium or workload balancing. */
  async loadReport(from: string, to: string) {
    const rows = await this.prisma.substitution.findMany({
      where: {
        date: { gte: toDateOnly(from), lte: toDateOnly(to) },
        status: { in: ['ASSIGNED', 'CONDUCTED'] },
      },
      include: { substituteStaff: true },
    });
    const map = new Map<string, { name: string; periods: number }>();
    for (const r of rows) {
      if (!r.substituteStaff) continue;
      const key = r.substituteStaffId;
      const cur = map.get(key) || {
        name: `${r.substituteStaff.firstName} ${r.substituteStaff.lastName}`,
        periods: 0,
      };
      cur.periods++;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([staffId, v]) => ({ staffId, ...v }))
      .sort((a, b) => b.periods - a.periods);
  }
}
