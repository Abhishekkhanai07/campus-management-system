import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';

/**
 * Writes an audit row for every handler decorated with @Audit(...).
 * Audit rows are append-only - nothing in the app updates or deletes them (SRS FR-AUD-02).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector, private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const meta = this.reflector.get<AuditMeta>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    return next.handle().pipe(
      tap((result) => {
        const entityId = result?.id || req.params?.id;
        this.prisma.auditLog
          .create({
            data: {
              userId: user?.id,
              actorName: user?.name,
              role: user?.role,
              module: meta.module,
              action: meta.action,
              entity: meta.entity,
              entityId: typeof entityId === 'string' ? entityId : undefined,
              newValue: safeJson(req.body),
              ip: req.ip,
              userAgent: req.headers?.['user-agent'],
            },
          })
          .catch(() => undefined);
      }),
    );
  }
}

function safeJson(body: any) {
  if (!body || typeof body !== 'object') return undefined;
  const clone = { ...body };
  for (const key of ['password', 'newPassword', 'passwordHash', 'token']) delete clone[key];
  return clone;
}
