import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AcademicService } from '../academic/academic.service';
import { CreateStaffDto } from './dto';
import { weekdayOf, today } from '../common/dates';

@Injectable()
export class StaffService {
  constructor(private prisma: PrismaService, private academic: AcademicService) {}

  list(query: { q?: string; departmentId?: string; teachingOnly?: string }) {
    return this.prisma.staff.findMany({
      where: {
        isActive: true,
        departmentId: query.departmentId,
        isTeaching: query.teachingOnly === 'true' ? true : undefined,
        ...(query.q
          ? {
              OR: [
                { firstName: { contains: query.q, mode: 'insensitive' as const } },
                { lastName: { contains: query.q, mode: 'insensitive' as const } },
                { employeeCode: { contains: query.q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        department: true,
        classTeacherOf: { include: { classLevel: true } },
        _count: { select: { allocations: true, slots: true } },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async create(dto: CreateStaffDto) {
    const count = await this.prisma.staff.count();
    const employeeCode = `EMP${String(count + 1).padStart(4, '0')}`;
    const tempPassword = `Camp${Math.floor(1000 + Math.random() * 9000)}!`;

    const staff = await this.prisma.staff.create({
      data: {
        employeeCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        designation: dto.designation,
        qualification: dto.qualification,
        phone: dto.phone,
        email: dto.email,
        department: dto.departmentId ? { connect: { id: dto.departmentId } } : undefined,
        isTeaching: dto.isTeaching ?? true,
        maxPeriodsPerDay: dto.maxPeriodsPerDay ?? 6,
        maxPeriodsPerWeek: dto.maxPeriodsPerWeek ?? 30,
        user: {
          create: {
            loginId: employeeCode,
            email: dto.email,
            phone: dto.phone,
            role: (dto.role as any) || 'TEACHER',
            passwordHash: await bcrypt.hash(tempPassword, 10),
          },
        },
      },
    });

    // opening leave balances for the current calendar year
    const types = await this.prisma.leaveType.findMany();
    const year = new Date().getFullYear();
    for (const t of types) {
      await this.prisma.leaveBalance.create({
        data: { staffId: staff.id, leaveTypeId: t.id, year, opening: t.annualQuota },
      });
    }

    return { ...staff, credentials: { loginId: employeeCode, tempPassword } };
  }

  /** FR-STF-10: one page that answers "what does this teacher teach and how many students". */
  async profile(id: string) {
    const year = await this.academic.requireActiveYear();
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: {
        department: true,
        classTeacherOf: {
          where: { academicYearId: year.id },
          include: { classLevel: true, _count: { select: { enrollments: true } } },
        },
        allocations: {
          where: { academicYearId: year.id },
          include: {
            subject: true,
            section: { include: { classLevel: true, _count: { select: { enrollments: true } } } },
          },
        },
        slots: { include: { subject: true, section: { include: { classLevel: true } } } },
        leaveBalances: { include: { leaveType: true }, where: { year: new Date().getFullYear() } },
      },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    const studentsTaught = staff.allocations.reduce((a, al) => a + al.section._count.enrollments, 0);

    return {
      ...staff,
      summary: {
        subjectsTaught: new Set(staff.allocations.map((a) => a.subjectId)).size,
        sectionsTaught: new Set(staff.allocations.map((a) => a.sectionId)).size,
        studentsTaught,
        periodsPerWeek: staff.slots.length,
        maxPeriodsPerWeek: staff.maxPeriodsPerWeek,
        isClassTeacher: staff.classTeacherOf.length > 0,
      },
    };
  }

  /** What the logged-in teacher sees after login: only their own subjects and sections. */
  async myTeaching(staffId: string) {
    if (!staffId) throw new BadRequestException('This login is not linked to a staff record');
    const year = await this.academic.requireActiveYear();

    const [allocations, classTeacherOf, slots] = await Promise.all([
      this.prisma.teacherAllocation.findMany({
        where: { staffId, academicYearId: year.id },
        include: {
          subject: true,
          section: { include: { classLevel: true, _count: { select: { enrollments: true } } } },
        },
      }),
      this.prisma.section.findMany({
        where: { classTeacherId: staffId, academicYearId: year.id },
        include: { classLevel: true, _count: { select: { enrollments: true } } },
      }),
      this.prisma.timetableSlot.findMany({
        where: { staffId },
        include: { subject: true, section: { include: { classLevel: true } } },
        orderBy: [{ weekday: 'asc' }, { periodNo: 'asc' }],
      }),
    ]);

    const wd = weekdayOf(today());
    return {
      allocations: allocations.map((a) => ({
        id: a.id,
        subjectId: a.subjectId,
        subject: a.subject.name,
        sectionId: a.sectionId,
        section: `${a.section.classLevel.name} ${a.section.name}`,
        students: a.section._count.enrollments,
      })),
      classTeacherOf: classTeacherOf.map((s) => ({
        sectionId: s.id,
        section: `${s.classLevel.name} ${s.name}`,
        students: s._count.enrollments,
      })),
      todaySlots: slots
        .filter((s) => s.weekday === wd)
        .map((s) => ({
          id: s.id,
          periodNo: s.periodNo,
          startTime: s.startTime,
          endTime: s.endTime,
          subject: s.subject.name,
          subjectId: s.subjectId,
          sectionId: s.sectionId,
          section: `${s.section.classLevel.name} ${s.section.name}`,
          room: s.room,
        })),
      weeklySlots: slots,
      totalStudents: allocations.reduce((a, al) => a + al.section._count.enrollments, 0),
    };
  }

  async deactivate(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
      include: { classTeacherOf: true, allocations: true },
    });
    if (staff.classTeacherOf.length || staff.allocations.length) {
      throw new BadRequestException(
        'This teacher is still a class teacher or has subject allocations. Reassign those first.',
      );
    }
    const updated = await this.prisma.staff.update({ where: { id }, data: { isActive: false } });
    if (updated.userId) await this.prisma.user.update({ where: { id: updated.userId }, data: { isActive: false } });
    return updated;
  }
}
