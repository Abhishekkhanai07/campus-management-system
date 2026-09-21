import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-change-me',
    });
  }

  /**
   * Rebuilds the request scope on every call so that permissions can never be
   * stale (SRS FR-AUTH-04: access control is enforced on the server, per request).
   */
  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        staff: { include: { classTeacherOf: true } },
        student: true,
        guardian: true,
      },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Account is not active');

    const name = user.staff
      ? `${user.staff.firstName} ${user.staff.lastName}`
      : user.student
      ? `${user.student.firstName} ${user.student.lastName}`
      : user.guardian?.name || user.loginId;

    let guardianOfIds: string[] = [];
    if (user.guardian) {
      const wards = await this.prisma.guardian.findMany({
        where: { userId: user.id },
        select: { studentId: true },
      });
      guardianOfIds = wards.map((w) => w.studentId);
    }

    return {
      id: user.id,
      loginId: user.loginId,
      role: user.role,
      name,
      staffId: user.staff?.id,
      studentId: user.student?.id,
      guardianOfIds,
      classTeacherOfSectionIds: user.staff?.classTeacherOf?.map((s) => s.id) || [],
      mustChangePassword: user.mustChangePassword,
    };
  }
}
