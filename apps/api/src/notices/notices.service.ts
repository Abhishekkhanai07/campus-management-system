import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class NoticesService {
  constructor(private prisma: PrismaService) {}

  list(user: AuthUser) {
    const audiences = ['ALL'];
    if (['TEACHER', 'HOD', 'ADMIN', 'SUPER_ADMIN'].includes(user.role)) audiences.push('STAFF');
    if (user.role === 'STUDENT') audiences.push('STUDENTS');
    if (user.role === 'PARENT') audiences.push('PARENTS');

    return this.prisma.notice.findMany({
      where: { audience: { in: audiences } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  create(user: AuthUser, dto: { title: string; body: string; audience?: string }) {
    return this.prisma.notice.create({
      data: { ...dto, audience: dto.audience || 'ALL', createdById: user.id },
    });
  }
}
