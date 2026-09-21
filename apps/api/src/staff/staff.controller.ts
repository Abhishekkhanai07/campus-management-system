import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StaffService } from './staff.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { CreateStaffDto } from './dto';

@Controller('staff')
export class StaffController {
  constructor(private svc: StaffService) {}

  @Get()
  list(
    @Query('q') q?: string,
    @Query('departmentId') departmentId?: string,
    @Query('teachingOnly') teachingOnly?: string,
  ) {
    return this.svc.list({ q, departmentId, teachingOnly });
  }

  @Get('me/teaching')
  myTeaching(@CurrentUser() user: AuthUser) { return this.svc.myTeaching(user.staffId); }

  @Get(':id')
  profile(@Param('id') id: string) { return this.svc.profile(id); }

  @Roles('ADMIN')
  @Post()
  @Audit({ module: 'STAFF', action: 'CREATE_STAFF', entity: 'Staff' })
  create(@Body() dto: CreateStaffDto) { return this.svc.create(dto); }

  @Roles('ADMIN')
  @Patch(':id/deactivate')
  @Audit({ module: 'STAFF', action: 'DEACTIVATE_STAFF', entity: 'Staff' })
  deactivate(@Param('id') id: string) { return this.svc.deactivate(id); }
}
