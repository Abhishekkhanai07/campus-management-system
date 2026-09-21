import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '../common/decorators/roles.decorator';

@Roles('ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get()
  list(@Query() query: any) { return this.svc.list(query); }

  @Get('live')
  live() { return this.svc.liveFeed(); }

  @Get('stats')
  stats() { return this.svc.stats(); }
}
