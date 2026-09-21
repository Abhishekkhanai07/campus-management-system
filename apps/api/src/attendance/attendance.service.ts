import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicService } from '../academic/academic.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CorrectionDto, MarkDailyDto, MarkPeriodDto } from './dto';
import { isoDate, pct, toDateOnly, today, weekdayOf } from '../common/dates';

const PRESENT_LIKE = ['PRESENT', 'LATE', 'ON_DUTY'];

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService, private academic: AcademicService) {}

  // ---------------------------------------------------------------- guards
  private async assertMarkableDate(date: Date) {
    const d = toDateOnly(date);
    if (d > today()) throw new BadRequestException('Attendance cannot be marked for a future date');
    const year = await this.academic.requireActiveYear();
    if (d < toDateOnly(year.startDate) || d > toDateOnly(year.endDate))
      throw new BadRequestException('That date is outside the active academic year');
    if (await this.academic.isHoliday(d))
      throw new BadRequestException('That day is a declared holiday - attendance is not taken');
    if (weekdayOf(d) === 7) throw new BadRequestException('Sunday is not a working day');
  }

  private async assertCanMarkSection(user: AuthUser, sectionId: string) {
    if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return;
    if (user.classTeacherOfSectionIds?.includes(sectionId)) return;
    throw new ForbiddenException('Only the class teacher of this section can mark daily attendance');
  }

  /** FR-ATT-03 / FR-ATT-04: own slot, or confirmed substitute for that date. */
  private async assertCanMarkSlot(user: AuthUser, slotId: string, date: Date) {
    if (['SUPER_ADMIN', 'ADMIN'].includes(user.role)) return { bySubstitute: false };
    const slot = await this.prisma.timetableSlot.findUnique({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Timetable period not found');
    if (slot.staffId === user.staffId) return { bySubstitute: false };

    const sub = await this.prisma.substitution.findFirst({
      where: { slotId, date: toDateOnly(date), substituteStaffId: user.staffId, status: 'ASSIGNED' },
    });
    if (sub) return { bySubstitute: true };

    throw new ForbiddenException('This period is not allotted to you, and you are not the substitute for it');
  }

  // ---------------------------------------------------------------- rosters
  async dailyRoster(user: AuthUser, sectionId: string, dateStr: string) {
    const date = toDateOnly(dateStr);
    const year = await this.academic.requireActiveYear();
    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      include: { classLevel: true, classTeacher: true },
    });
    if (!section) throw new NotFoundException('Section not found');

    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId, academicYearId: year.id, status: 'ACTIVE' },
      include: { student: true },
      orderBy: [{ rollNo: 'asc' }],
    });

    const existing = await this.prisma.dailyAttendance.findMany({
      where: { date, studentId: { in: enrollments.map((e) => e.studentId) } },
    });
    const map = new Map(existing.map((e) => [e.studentId, e]));
    const holiday = await this.academic.isHoliday(date);

    return {
      section: { id: section.id, name: `${section.classLevel.name} ${section.name}` },
      date: isoDate(date),
      isHoliday: holiday,
      isLocked: false,
      alreadyMarked: existing.length > 0,
      canMark:
        ['SUPER_ADMIN', 'ADMIN'].includes(user.role) ||
        (user.classTeacherOfSectionIds || []).includes(sectionId),
      rows: enrollments.map((e) => ({
        studentId: e.studentId,
        rollNo: e.rollNo,
        admissionNo: e.student.admissionNo,
        name: `${e.student.firstName} ${e.student.lastName}`,
        photoUrl: e.student.photoUrl,
        status: map.get(e.studentId)?.status || 'PRESENT',
        saved: map.has(e.studentId),
      })),
    };
  }

  async periodRoster(user: AuthUser, slotId: string, dateStr: string) {
    const date = toDateOnly(dateStr);
    const year = await this.academic.requireActiveYear();
    const slot = await this.prisma.timetableSlot.findUnique({
      where: { id: slotId },
      include: { subject: true, staff: true, section: { include: { classLevel: true } } },
    });
    if (!slot) throw new NotFoundException('Timetable period not found');

    if (weekdayOf(date) !== slot.weekday)
      throw new BadRequestException('That period does not fall on the selected date');

    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId: slot.sectionId, academicYearId: year.id, status: 'ACTIVE' },
      include: { student: true },
      orderBy: [{ rollNo: 'asc' }],
    });

    const existing = await this.prisma.periodAttendance.findMany({
      where: { slotId, date },
    });
    const map = new Map(existing.map((e) => [e.studentId, e]));

    const sub = await this.prisma.substitution.findFirst({
      where: { slotId, date, status: { in: ['ASSIGNED', 'CONDUCTED'] } },
      include: { substituteStaff: true },
    });

    return {
      slot: {
        id: slot.id,
        periodNo: slot.periodNo,
        time: `${slot.startTime}-${slot.endTime}`,
        subject: slot.subject.name,
        section: `${slot.section.classLevel.name} ${slot.section.name}`,
        regularTeacher: `${slot.staff.firstName} ${slot.staff.lastName}`,
      },
      date: isoDate(date),
      substitute: sub?.substituteStaff
        ? `${sub.substituteStaff.firstName} ${sub.substituteStaff.lastName}`
        : null,
      alreadyMarked: existing.length > 0,
      rows: enrollments.map((e) => ({
        studentId: e.studentId,
        rollNo: e.rollNo,
        name: `${e.student.firstName} ${e.student.lastName}`,
        status: map.get(e.studentId)?.status || 'PRESENT',
        saved: map.has(e.studentId),
      })),
    };
  }

  // ---------------------------------------------------------------- marking
  async markDaily(user: AuthUser, dto: MarkDailyDto) {
    const date = toDateOnly(dto.date);
    await this.assertMarkableDate(date);
    await this.assertCanMarkSection(user, dto.sectionId);

    const inst = await this.academic.institute();
    const existing = await this.prisma.dailyAttendance.findMany({
      where: { date, studentId: { in: dto.rows.map((r) => r.studentId) } },
    });

    // FR-ATT-06: outside the edit window, a change needs an approved correction
    if (existing.length) {
      const oldest = existing.reduce((a, b) => (a.markedAt < b.markedAt ? a : b));
      const hours = (Date.now() - oldest.markedAt.getTime()) / 3_600_000;
      if (hours > inst.attendanceEditWindowHrs && !['SUPER_ADMIN', 'ADMIN'].includes(user.role)) {
        throw new BadRequestException(
          'The edit window for this date has closed. Raise a correction request instead.',
        );
      }
    }

    for (const row of dto.rows) {
      await this.prisma.dailyAttendance.upsert({
        where: { studentId_date: { studentId: row.studentId, date } },
        create: {
          studentId: row.studentId,
          date,
          status: row.status as any,
          remark: row.remark,
          markedById: user.id,
        },
        update: { status: row.status as any, remark: row.remark, markedById: user.id, markedAt: new Date() },
      });
    }

    const absent = dto.rows.filter((r) => r.status === 'ABSENT').length;
    return {
      ok: true,
      saved: dto.rows.length,
      absent,
      message: `Attendance saved for ${dto.rows.length} students (${absent} absent)`,
    };
  }

  async markPeriod(user: AuthUser, dto: MarkPeriodDto) {
    const date = toDateOnly(dto.date);
    await this.assertMarkableDate(date);
    const { bySubstitute } = await this.assertCanMarkSlot(user, dto.slotId, date);

    const slot = await this.prisma.timetableSlot.findUnique({ where: { id: dto.slotId } });

    for (const row of dto.rows) {
      await this.prisma.periodAttendance.upsert({
        where: { studentId_slotId_date: { studentId: row.studentId, slotId: dto.slotId, date } },
        create: {
          studentId: row.studentId,
          slotId: dto.slotId,
          subjectId: slot.subjectId,
          date,
          status: row.status as any,
          markedById: user.id,
          bySubstitute,
        },
        update: { status: row.status as any, markedById: user.id, bySubstitute, markedAt: new Date() },
      });
    }

    // a substituted period that gets attendance marked is recorded as conducted (FR-SUB-07)
    if (bySubstitute) {
      await this.prisma.substitution.updateMany({
        where: { slotId: dto.slotId, date, substituteStaffId: user.staffId },
        data: { status: 'CONDUCTED' },
      });
    }

    const absent = dto.rows.filter((r) => r.status === 'ABSENT').length;
    return { ok: true, saved: dto.rows.length, absent, bySubstitute };
  }

  // ---------------------------------------------------------------- reports
  /** Section summary for a date range, used by the class teacher and admin. */
  async sectionReport(sectionId: string, from: string, to: string) {
    const year = await this.academic.requireActiveYear();
    const inst = await this.academic.institute();
    const fromD = toDateOnly(from);
    const toD = toDateOnly(to);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId, academicYearId: year.id, status: 'ACTIVE' },
      include: { student: true },
      orderBy: { rollNo: 'asc' },
    });

    const records = await this.prisma.dailyAttendance.findMany({
      where: {
        studentId: { in: enrollments.map((e) => e.studentId) },
        date: { gte: fromD, lte: toD },
      },
    });

    const rows = enrollments.map((e) => {
      const mine = records.filter((r) => r.studentId === e.studentId);
      const present = mine.filter((r) => PRESENT_LIKE.includes(r.status)).length;
      const onLeave = mine.filter((r) => r.status === 'ON_LEAVE').length;
      const counted = inst.leaveCountsAsPresent ? mine.length : mine.length - onLeave;
      const countedPresent = inst.leaveCountsAsPresent ? present + onLeave : present;
      const percentage = pct(countedPresent, counted);
      return {
        studentId: e.studentId,
        rollNo: e.rollNo,
        name: `${e.student.firstName} ${e.student.lastName}`,
        held: mine.length,
        present,
        absent: mine.filter((r) => r.status === 'ABSENT').length,
        onLeave,
        pct: percentage,
        isDefaulter: mine.length > 0 && percentage < inst.minAttendancePct,
      };
    });

    return {
      from: isoDate(fromD),
      to: isoDate(toD),
      minRequired: inst.minAttendancePct,
      rows,
      average: rows.length ? Math.round((rows.reduce((a, r) => a + r.pct, 0) / rows.length) * 10) / 10 : 0,
    };
  }

  /** Monthly register in the traditional grid shape (students x dates). */
  async register(sectionId: string, month: string) {
    const year = await this.academic.requireActiveYear();
    const [y, m] = month.split('-').map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 0));

    const enrollments = await this.prisma.enrollment.findMany({
      where: { sectionId, academicYearId: year.id, status: 'ACTIVE' },
      include: { student: true },
      orderBy: { rollNo: 'asc' },
    });
    const records = await this.prisma.dailyAttendance.findMany({
      where: { studentId: { in: enrollments.map((e) => e.studentId) }, date: { gte: from, lte: to } },
    });
    const holidays = await this.prisma.holiday.findMany({
      where: { academicYearId: year.id, date: { gte: from, lte: to } },
    });

    const days: string[] = [];
    for (let d = 1; d <= to.getUTCDate(); d++) days.push(isoDate(new Date(Date.UTC(y, m - 1, d))));

    return {
      month,
      days,
      holidays: holidays.map((h) => isoDate(h.date)),
      rows: enrollments.map((e) => ({
        studentId: e.studentId,
        rollNo: e.rollNo,
        name: `${e.student.firstName} ${e.student.lastName}`,
        marks: days.map((day) => {
          const rec = records.find((r) => r.studentId === e.studentId && isoDate(r.date) === day);
          return rec ? rec.status : null;
        }),
      })),
    };
  }

  /** FR-ATT-09: defaulter list, overall and subject-wise. */
  async defaulters(sectionId?: string) {
    const year = await this.academic.requireActiveYear();
    const inst = await this.academic.institute();

    const enrollments = await this.prisma.enrollment.findMany({
      where: { academicYearId: year.id, status: 'ACTIVE', sectionId },
      include: { student: true, section: { include: { classLevel: true } } },
    });

    const all = await this.prisma.dailyAttendance.findMany({
      where: { studentId: { in: enrollments.map((e) => e.studentId) } },
    });

    const out = enrollments
      .map((e) => {
        const mine = all.filter((r) => r.studentId === e.studentId);
        const present = mine.filter((r) => PRESENT_LIKE.includes(r.status)).length;
        const onLeave = mine.filter((r) => r.status === 'ON_LEAVE').length;
        const counted = inst.leaveCountsAsPresent ? mine.length : mine.length - onLeave;
        const countedPresent = inst.leaveCountsAsPresent ? present + onLeave : present;
        return {
          studentId: e.studentId,
          name: `${e.student.firstName} ${e.student.lastName}`,
          admissionNo: e.student.admissionNo,
          section: `${e.section.classLevel.name} ${e.section.name}`,
          held: mine.length,
          present: countedPresent,
          pct: pct(countedPresent, counted),
        };
      })
      .filter((r) => r.held > 0 && r.pct < inst.minAttendancePct)
      .sort((a, b) => a.pct - b.pct);

    return { minRequired: inst.minAttendancePct, count: out.length, rows: out };
  }

  /** FR-ATT-07: which periods were never marked today. */
  async notMarked(dateStr?: string) {
    const date = dateStr ? toDateOnly(dateStr) : today();
    const wd = weekdayOf(date);
    const slots = await this.prisma.timetableSlot.findMany({
      where: { weekday: wd },
      include: { subject: true, staff: true, section: { include: { classLevel: true } } },
      orderBy: { periodNo: 'asc' },
    });
    const marked = await this.prisma.periodAttendance.findMany({
      where: { date },
      select: { slotId: true },
      distinct: ['slotId'],
    });
    const markedIds = new Set(marked.map((m) => m.slotId));

    return {
      date: isoDate(date),
      rows: slots
        .filter((s) => !markedIds.has(s.id))
        .map((s) => ({
          slotId: s.id,
          periodNo: s.periodNo,
          time: `${s.startTime}-${s.endTime}`,
          subject: s.subject.name,
          section: `${s.section.classLevel.name} ${s.section.name}`,
          teacher: `${s.staff.firstName} ${s.staff.lastName}`,
          staffId: s.staffId,
        })),
    };
  }

  /** Institute-wide figure used on the dashboard. */
  async todaySummary(dateStr?: string) {
    const date = dateStr ? toDateOnly(dateStr) : today();
    const records = await this.prisma.dailyAttendance.findMany({ where: { date } });
    const present = records.filter((r) => PRESENT_LIKE.includes(r.status)).length;
    const year = await this.academic.activeYear();
    const totalStudents = year
      ? await this.prisma.enrollment.count({ where: { academicYearId: year.id, status: 'ACTIVE' } })
      : 0;

    return {
      date: isoDate(date),
      totalStudents,
      marked: records.length,
      present,
      absent: records.filter((r) => r.status === 'ABSENT').length,
      onLeave: records.filter((r) => r.status === 'ON_LEAVE').length,
      pct: pct(present, records.length),
      notMarkedStudents: Math.max(totalStudents - records.length, 0),
    };
  }

  /** A student's own view: calendar + subject-wise. */
  async myAttendance(studentId: string) {
    const inst = await this.academic.institute();
    const [daily, period] = await Promise.all([
      this.prisma.dailyAttendance.findMany({ where: { studentId }, orderBy: { date: 'desc' } }),
      this.prisma.periodAttendance.findMany({ where: { studentId }, include: { subject: true } }),
    ]);

    const bySubject: Record<string, { subject: string; held: number; present: number }> = {};
    for (const p of period) {
      bySubject[p.subjectId] ||= { subject: p.subject.name, held: 0, present: 0 };
      bySubject[p.subjectId].held++;
      if (PRESENT_LIKE.includes(p.status)) bySubject[p.subjectId].present++;
    }

    const present = daily.filter((d) => PRESENT_LIKE.includes(d.status)).length;
    return {
      minRequired: inst.minAttendancePct,
      overallPct: pct(present, daily.length),
      totalDays: daily.length,
      presentDays: present,
      absentDays: daily.filter((d) => d.status === 'ABSENT').length,
      calendar: daily.map((d) => ({ date: isoDate(d.date), status: d.status })),
      bySubject: Object.values(bySubject).map((s) => ({ ...s, pct: pct(s.present, s.held) })),
    };
  }

  // ---------------------------------------------------------------- corrections
  async requestCorrection(user: AuthUser, dto: CorrectionDto) {
    const record =
      dto.kind === 'DAILY'
        ? await this.prisma.dailyAttendance.findUnique({ where: { id: dto.recordId } })
        : await this.prisma.periodAttendance.findUnique({ where: { id: dto.recordId } });
    if (!record) throw new NotFoundException('Attendance record not found');

    return this.prisma.attendanceCorrection.create({
      data: {
        kind: dto.kind,
        recordId: dto.recordId,
        oldValue: record.status,
        newValue: dto.newValue,
        reason: dto.reason,
        requestedById: user.id,
      },
    });
  }

  pendingCorrections() {
    return this.prisma.attendanceCorrection.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async decideCorrection(user: AuthUser, id: string, approve: boolean) {
    const req = await this.prisma.attendanceCorrection.findUnique({ where: { id } });
    if (!req || req.status !== 'PENDING') throw new BadRequestException('This request is already decided');

    if (approve) {
      if (req.kind === 'DAILY') {
        await this.prisma.dailyAttendance.update({
          where: { id: req.recordId },
          data: { status: req.newValue as any },
        });
      } else {
        await this.prisma.periodAttendance.update({
          where: { id: req.recordId },
          data: { status: req.newValue as any },
        });
      }
    }

    return this.prisma.attendanceCorrection.update({
      where: { id },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED',
        approvedById: user.id,
        decidedAt: new Date(),
      },
    });
  }
}
