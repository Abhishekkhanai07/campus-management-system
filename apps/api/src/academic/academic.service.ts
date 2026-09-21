import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AllocateDto, CreateAcademicYearDto, CreateClassDto, CreateDepartmentDto, CreateSectionDto,
  CreateSubjectDto, HolidayDto, MapClassSubjectDto, SlotDto,
} from './dto';
import { toDateOnly } from '../common/dates';

@Injectable()
export class AcademicService {
  constructor(private prisma: PrismaService) {}

  // ---------------------------------------------------------------- institute
  async institute() {
    const inst = await this.prisma.institute.findFirst();
    if (!inst) throw new NotFoundException('Institute is not set up yet');
    return inst;
  }

  async updateInstitute(data: any) {
    const inst = await this.institute();
    return this.prisma.institute.update({ where: { id: inst.id }, data });
  }

  // ---------------------------------------------------------------- academic year
  activeYear() {
    return this.prisma.academicYear.findFirst({ where: { isActive: true } });
  }

  async requireActiveYear() {
    const year = await this.activeYear();
    if (!year) throw new BadRequestException('No academic year is active. Set one in Setup first.');
    return year;
  }

  years() {
    return this.prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
  }

  createYear(dto: CreateAcademicYearDto) {
    return this.prisma.academicYear.create({
      data: {
        name: dto.name,
        startDate: toDateOnly(dto.startDate),
        endDate: toDateOnly(dto.endDate),
      },
    });
  }

  async activateYear(id: string) {
    await this.prisma.academicYear.updateMany({ data: { isActive: false }, where: {} });
    return this.prisma.academicYear.update({ where: { id }, data: { isActive: true } });
  }

  // ---------------------------------------------------------------- departments
  departments() {
    return this.prisma.department.findMany({
      include: { hod: true, _count: { select: { classes: true, staff: true } } },
      orderBy: { name: 'asc' },
    });
  }

  createDepartment(dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  // ---------------------------------------------------------------- classes & sections
  async classes() {
    const year = await this.activeYear();
    return this.prisma.classLevel.findMany({
      include: {
        department: true,
        sections: {
          where: year ? { academicYearId: year.id } : {},
          include: {
            classTeacher: true,
            _count: { select: { enrollments: true } },
          },
          orderBy: { name: 'asc' },
        },
        classSubjects: { include: { subject: true } },
      },
      orderBy: { displayOrder: 'asc' },
    });
  }

  createClass(dto: CreateClassDto) {
    return this.prisma.classLevel.create({ data: dto });
  }

  async createSection(dto: CreateSectionDto) {
    const year = await this.requireActiveYear();
    return this.prisma.section.create({
      data: {
        name: dto.name,
        classLevelId: dto.classLevelId,
        capacity: dto.capacity ?? 60,
        room: dto.room,
        classTeacherId: dto.classTeacherId,
        academicYearId: year.id,
      },
    });
  }

  async sections() {
    const year = await this.requireActiveYear();
    return this.prisma.section.findMany({
      where: { academicYearId: year.id },
      include: {
        classLevel: true,
        classTeacher: true,
        _count: { select: { enrollments: true } },
      },
      orderBy: [{ classLevel: { displayOrder: 'asc' } }, { name: 'asc' }],
    });
  }

  async sectionDetail(id: string) {
    const section = await this.prisma.section.findUnique({
      where: { id },
      include: {
        classLevel: { include: { classSubjects: { include: { subject: true } } } },
        classTeacher: true,
        allocations: { include: { staff: true, subject: true } },
        enrollments: {
          where: { status: 'ACTIVE' },
          include: { student: true },
          orderBy: { rollNo: 'asc' },
        },
        slots: { include: { subject: true, staff: true }, orderBy: [{ weekday: 'asc' }, { periodNo: 'asc' }] },
      },
    });
    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  /** SRS FR-ALL-04/05: exactly one class teacher per section, history kept in the audit log. */
  async assignClassTeacher(sectionId: string, staffId: string) {
    const staff = await this.prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff || !staff.isActive) throw new BadRequestException('That staff member is not active');
    return this.prisma.section.update({ where: { id: sectionId }, data: { classTeacherId: staffId } });
  }

  /** Sections that still have no class teacher - shown as a warning on the admin dashboard. */
  async sectionsWithoutClassTeacher() {
    const year = await this.requireActiveYear();
    return this.prisma.section.findMany({
      where: { academicYearId: year.id, classTeacherId: null },
      include: { classLevel: true },
    });
  }

  // ---------------------------------------------------------------- subjects
  subjects() {
    return this.prisma.subject.findMany({
      include: { department: true, classSubjects: { include: { classLevel: true } } },
      orderBy: { name: 'asc' },
    });
  }

  createSubject(dto: CreateSubjectDto) {
    return this.prisma.subject.create({ data: dto as any });
  }

  mapClassSubject(dto: MapClassSubjectDto) {
    return this.prisma.classSubject.create({ data: dto });
  }

  // ---------------------------------------------------------------- allocation
  async allocations(filter: { staffId?: string; sectionId?: string; subjectId?: string } = {}) {
    const year = await this.requireActiveYear();
    return this.prisma.teacherAllocation.findMany({
      where: { academicYearId: year.id, ...filter },
      include: {
        staff: true,
        subject: true,
        section: { include: { classLevel: true, _count: { select: { enrollments: true } } } },
      },
      orderBy: [{ staff: { firstName: 'asc' } }],
    });
  }

  /** FR-ALL-01/02/03: prevent duplicate allocation and warn on overload. */
  async allocate(dto: AllocateDto) {
    const year = await this.requireActiveYear();

    const existing = await this.prisma.teacherAllocation.findFirst({
      where: { subjectId: dto.subjectId, sectionId: dto.sectionId, academicYearId: year.id },
    });
    if (existing && !dto.isCoTeacher) {
      throw new BadRequestException(
        'This subject is already allotted to a teacher in this section. Mark it as co-teaching to share it.',
      );
    }

    const created = await this.prisma.teacherAllocation.create({
      data: { ...dto, academicYearId: year.id },
      include: { staff: true, subject: true, section: { include: { classLevel: true } } },
    });

    const load = await this.weeklyLoad(dto.staffId);
    return { ...created, weeklyLoad: load };
  }

  removeAllocation(id: string) {
    return this.prisma.teacherAllocation.delete({ where: { id } });
  }

  async weeklyLoad(staffId: string) {
    const [slots, staff] = await Promise.all([
      this.prisma.timetableSlot.count({ where: { staffId } }),
      this.prisma.staff.findUnique({ where: { id: staffId } }),
    ]);
    return { periodsPerWeek: slots, max: staff?.maxPeriodsPerWeek ?? 30, isOverloaded: slots > (staff?.maxPeriodsPerWeek ?? 30) };
  }

  /** Subject-wise view: who teaches what, with unallocated subjects highlighted (FR-ALL-07). */
  async allocationMatrix() {
    const year = await this.requireActiveYear();
    const sections = await this.prisma.section.findMany({
      where: { academicYearId: year.id },
      include: {
        classLevel: { include: { classSubjects: { include: { subject: true } } } },
        allocations: { include: { staff: true, subject: true } },
      },
      orderBy: [{ classLevel: { displayOrder: 'asc' } }, { name: 'asc' }],
    });

    return sections.map((s) => ({
      sectionId: s.id,
      section: `${s.classLevel.name} ${s.name}`,
      subjects: s.classLevel.classSubjects.map((cs) => {
        const alloc = s.allocations.find((a) => a.subjectId === cs.subjectId);
        return {
          subjectId: cs.subjectId,
          subject: cs.subject.name,
          teacher: alloc ? `${alloc.staff.firstName} ${alloc.staff.lastName}` : null,
          allocationId: alloc?.id || null,
        };
      }),
    }));
  }

  // ---------------------------------------------------------------- timetable
  async timetable(query: { sectionId?: string; staffId?: string }) {
    return this.prisma.timetableSlot.findMany({
      where: { sectionId: query.sectionId, staffId: query.staffId },
      include: { subject: true, staff: true, section: { include: { classLevel: true } } },
      orderBy: [{ weekday: 'asc' }, { periodNo: 'asc' }],
    });
  }

  /** FR-TT-02: no teacher and no room may be double booked. */
  async createSlot(dto: SlotDto) {
    const clash = await this.prisma.timetableSlot.findFirst({
      where: { staffId: dto.staffId, weekday: dto.weekday, periodNo: dto.periodNo },
      include: { section: { include: { classLevel: true } } },
    });
    if (clash) {
      throw new BadRequestException(
        `That teacher already has period ${dto.periodNo} with ${clash.section.classLevel.name} ${clash.section.name}`,
      );
    }
    if (dto.room) {
      const roomClash = await this.prisma.timetableSlot.findFirst({
        where: { room: dto.room, weekday: dto.weekday, periodNo: dto.periodNo },
      });
      if (roomClash) throw new BadRequestException(`Room ${dto.room} is already booked for that period`);
    }
    return this.prisma.timetableSlot.create({ data: dto });
  }

  deleteSlot(id: string) {
    return this.prisma.timetableSlot.delete({ where: { id } });
  }

  // ---------------------------------------------------------------- holidays
  async holidays() {
    const year = await this.requireActiveYear();
    return this.prisma.holiday.findMany({
      where: { academicYearId: year.id },
      orderBy: { date: 'asc' },
    });
  }

  async addHoliday(dto: HolidayDto) {
    const year = await this.requireActiveYear();
    return this.prisma.holiday.create({
      data: { date: toDateOnly(dto.date), title: dto.title, academicYearId: year.id },
    });
  }

  async isHoliday(date: Date) {
    const year = await this.activeYear();
    if (!year) return false;
    const found = await this.prisma.holiday.findFirst({
      where: { date: toDateOnly(date), academicYearId: year.id },
    });
    return !!found;
  }
}
