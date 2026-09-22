import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { CreateComplaintDto, CreateMonthlyFeedbackDto, UpdateComplaintDto } from './dto';

const MANAGEMENT_ROLES = ['ADMIN', 'HOD', 'SUPER_ADMIN'];
const COMPLAINT_STATUSES = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED'];

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  private requireStudent(user: AuthUser) {
    if (user.role !== 'STUDENT' || !user.studentId) {
      throw new ForbiddenException('Only students can submit complaints and class feedback');
    }
    return user.studentId;
  }

  private requireManagement(user: AuthUser) {
    if (!MANAGEMENT_ROLES.includes(user.role)) {
      throw new ForbiddenException('Only administrators and headmasters can view feedback');
    }
  }

  private async activeEnrollment(studentId: string) {
    const year = await this.prisma.academicYear.findFirst({ where: { isActive: true } });
    if (!year) throw new BadRequestException('No active academic year');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, academicYearId: year.id, status: 'ACTIVE' },
      include: { section: true },
    });
    if (!enrollment) throw new BadRequestException('Student has no active class enrollment');
    return { year, enrollment };
  }

  async teachers(user: AuthUser) {
    const studentId = this.requireStudent(user);
    const { year, enrollment } = await this.activeEnrollment(studentId);
    const allocations = await this.prisma.teacherAllocation.findMany({
      where: { sectionId: enrollment.sectionId, academicYearId: year.id },
      include: { staff: true, subject: true },
      orderBy: { staff: { firstName: 'asc' } },
    });

    return allocations.map((allocation) => ({
      id: allocation.staffId,
      name: `${allocation.staff.firstName} ${allocation.staff.lastName}`,
      subject: allocation.subject.name,
    }));
  }

  async myFeedback(user: AuthUser) {
    const studentId = this.requireStudent(user);
    const [complaints, monthlyFeedback] = await Promise.all([
      this.prisma.studentComplaint.findMany({
        where: { studentId },
        include: { teacher: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.monthlyClassFeedback.findMany({
        where: { studentId },
        orderBy: { month: 'desc' },
        take: 12,
      }),
    ]);
    return { complaints, monthlyFeedback };
  }

  async createComplaint(user: AuthUser, dto: CreateComplaintDto) {
    const studentId = this.requireStudent(user);
    const { year, enrollment } = await this.activeEnrollment(studentId);
    const allocation = await this.prisma.teacherAllocation.findFirst({
      where: { staffId: dto.teacherId, sectionId: enrollment.sectionId, academicYearId: year.id },
    });
    if (!allocation) throw new BadRequestException('That teacher is not assigned to your class');

    return this.prisma.studentComplaint.create({
      data: { studentId, teacherId: dto.teacherId, subject: dto.subject, description: dto.description },
      include: { teacher: true },
    });
  }

  async createMonthlyFeedback(user: AuthUser, dto: CreateMonthlyFeedbackDto) {
    const studentId = this.requireStudent(user);
    const { year, enrollment } = await this.activeEnrollment(studentId);
    const month = new Date(dto.month);
    month.setUTCDate(1);
    month.setUTCHours(0, 0, 0, 0);

    return this.prisma.monthlyClassFeedback.upsert({
      where: { studentId_academicYearId_month: { studentId, academicYearId: year.id, month } },
      create: {
        studentId,
        sectionId: enrollment.sectionId,
        academicYearId: year.id,
        month,
        rating: dto.rating,
        comments: dto.comments,
      },
      update: { rating: dto.rating, comments: dto.comments, sectionId: enrollment.sectionId },
    });
  }

  async complaints(user: AuthUser) {
    this.requireManagement(user);
    return this.prisma.studentComplaint.findMany({
      include: { student: true, teacher: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async monthlyFeedback(user: AuthUser) {
    this.requireManagement(user);
    return this.prisma.monthlyClassFeedback.findMany({
      include: {
        student: true,
        section: { include: { classLevel: true } },
      },
      orderBy: [{ month: 'desc' }, { section: { classLevel: { displayOrder: 'asc' } } }],
    });
  }

  async updateComplaint(user: AuthUser, id: string, dto: UpdateComplaintDto) {
    this.requireManagement(user);
    if (!COMPLAINT_STATUSES.includes(dto.status)) {
      throw new BadRequestException('Invalid complaint status');
    }
    const complaint = await this.prisma.studentComplaint.findUnique({ where: { id } });
    if (!complaint) throw new NotFoundException('Complaint not found');

    return this.prisma.studentComplaint.update({
      where: { id },
      data: {
        status: dto.status as any,
        response: dto.response,
        respondedById: user.id,
        respondedAt: new Date(),
      },
      include: { student: true, teacher: true },
    });
  }
}
