import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto } from './dto';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { loginId: dto.loginId.trim() },
      include: { staff: true, student: true, guardian: true },
    });

    if (!user) throw new UnauthorizedException('No account found for that ID');
    if (!user.isActive) throw new UnauthorizedException('This account has been deactivated');
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        `Too many failed attempts. Try again after ${user.lockedUntil.toLocaleTimeString()}`,
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      const failed = user.failedAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: failed,
          lockedUntil:
            failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        },
      });
      throw new UnauthorizedException('Wrong password');
    }

    const previousLogin = user.lastLoginAt;
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        actorName: this.displayName(user),
        role: user.role,
        module: 'AUTH',
        action: 'LOGIN',
        ip,
        userAgent,
      },
    });

    const token = await this.jwt.signAsync({ sub: user.id, role: user.role });

    return {
      accessToken: token,
      user: {
        id: user.id,
        loginId: user.loginId,
        role: user.role,
        name: this.displayName(user),
        staffId: user.staff?.id,
        studentId: user.student?.id,
        mustChangePassword: user.mustChangePassword,
        lastLoginAt: previousLogin,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is wrong');
    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException('New password must be different from the current one');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
        mustChangePassword: false,
      },
    });
    return { ok: true, message: 'Password changed' };
  }

  private displayName(user: any) {
    if (user.staff) return `${user.staff.firstName} ${user.staff.lastName}`;
    if (user.student) return `${user.student.firstName} ${user.student.lastName}`;
    return user.guardian?.name || user.loginId;
  }
}
