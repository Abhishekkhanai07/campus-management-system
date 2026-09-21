import { Body, Controller, Get, Post } from '@nestjs/common';
import { NoticesService } from './notices.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('notices')
export class NoticesController {
  constructor(private svc: NoticesService) {}

  @Get() list(@CurrentUser() user: AuthUser) { return this.svc.list(user); }

  @Roles('ADMIN', 'HOD', 'TEACHER', 'OFFICE')
  @Post()
  @Audit({ module: 'NOTICE', action: 'PUBLISH_NOTICE', entity: 'Notice' })
  create(@CurrentUser() user: AuthUser, @Body() dto: any) { return this.svc.create(user, dto); }
}
