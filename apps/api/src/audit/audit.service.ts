import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Actions the super admin should always be able to spot quickly (FR-AUD-04). */
const SENSITIVE = [
  'ENTER_MARKS', 'PROCESS_RESULTS', 'PUBLISH_RESULT', 'COLLECT_FEE', 'CANCEL_RECEIPT',
  'ASSIGN_FEE', 'DECIDE_CORRECTION', 'EXIT_STUDENT', 'DEACTIVATE_STAFF', 'UPDATE_INSTITUTE',
];

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async list(query: {
    module?: string; action?: string; userId?: string; from?: string; to?: string;
    sensitiveOnly?: string; page?: string;
  }) {
    const page = Number(query.page || 1);
    const take = 50;

    const where: any = {
      module: query.module,
      action: query.sensitiveOnly === 'true' ? { in: SENSITIVE } : query.action,
      userId: query.userId,
    };
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(`${query.to}T23:59:59`);
    }

    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * take, take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      page, total, pages: Math.ceil(total / take),
      rows: rows.map((r) => ({
        id: r.id,
        at: r.createdAt,
        who: r.actorName || 'System',
        role: r.role,
        module: r.module,
        action: r.action,
        entity: r.entity,
        entityId: r.entityId,
        details: r.newValue,
        ip: r.ip,
        isSensitive: SENSITIVE.includes(r.action),
      })),
    };
  }

  /** "What is happening right now" feed for the super admin. */
  async liveFeed() {
    const rows = await this.prisma.auditLog.findMany({ take: 25, orderBy: { createdAt: 'desc' } });
    return rows.map((r) => ({
      at: r.createdAt,
      who: r.actorName || 'System',
      role: r.role,
      text: `${r.action.replace(/_/g, ' ').toLowerCase()} in ${r.module.toLowerCase()}`,
      isSensitive: SENSITIVE.includes(r.action),
    }));
  }

  async stats() {
    const since = new Date(Date.now() - 7 * 86400000);
    const [byModule, byUser, logins] = await Promise.all([
      this.prisma.auditLog.groupBy({ by: ['module'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.auditLog.groupBy({ by: ['actorName'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      this.prisma.auditLog.count({ where: { action: 'LOGIN', createdAt: { gte: since } } }),
    ]);
    return {
      byModule: byModule.map((m) => ({ module: m.module, count: m._count._all })),
      topUsers: byUser
        .map((u) => ({ user: u.actorName, count: u._count._all }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      loginsLast7Days: logins,
    };
  }
}
