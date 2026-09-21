import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  list(query: { role?: string; q?: string }) {
    return this.prisma.user.findMany({
      where: {
        role: query.role as any,
        loginId: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
      },
      select: {
        id: true, loginId: true, role: true, isActive: true, lastLoginAt: true,
        email: true, phone: true, mustChangePassword: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  setActive(id: string, isActive: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: { id: true, loginId: true, isActive: true },
    });
  }

  async resetPassword(id: string) {
    const tempPassword = `Camp${Math.floor(1000 + Math.random() * 9000)}!`;
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(tempPassword, 10), mustChangePassword: true, failedAttempts: 0, lockedUntil: null },
    });
    return { id, tempPassword };
  }

  loginHistory() {
    return this.prisma.auditLog.findMany({
      where: { action: 'LOGIN' },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
