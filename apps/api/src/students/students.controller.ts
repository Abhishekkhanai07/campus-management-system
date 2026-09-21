import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { StudentsService } from './students.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CreateStudentDto, ExitStudentDto, StudentLeaveDto, TransferSectionDto } from './dto';

@Controller('students')
export class StudentsController {
  constructor(private svc: StudentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('sectionId') sectionId?: string,
    @Query('q') q?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.list(user, { sectionId, q, status });
  }

  @Get('strength')
  strength() { return this.svc.strength(); }

  @Get('leaves/pending')
  pendingLeaves(@CurrentUser() user: AuthUser) { return this.svc.pendingLeaves(user); }

  @Post('leaves')
  @Audit({ module: 'ATTENDANCE', action: 'APPLY_STUDENT_LEAVE', entity: 'StudentLeave' })
  applyLeave(@CurrentUser() user: AuthUser, @Body() dto: StudentLeaveDto) {
    return this.svc.applyLeave(user, dto);
  }

  @Roles('ADMIN', 'HOD', 'TEACHER')
  @Patch('leaves/:id/decision')
  @Audit({ module: 'ATTENDANCE', action: 'DECIDE_STUDENT_LEAVE', entity: 'StudentLeave' })
  decideLeave(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { approve: boolean; remark?: string },
  ) {
    return this.svc.decideLeave(user, id, body.approve, body.remark);
  }

  @Get(':id')
  profile(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.profile(user, id);
  }

  @Roles('ADMIN', 'OFFICE')
  @Post()
  @Audit({ module: 'STUDENT', action: 'ADMIT_STUDENT', entity: 'Student' })
  create(@Body() dto: CreateStudentDto) { return this.svc.create(dto); }

  @Roles('ADMIN', 'OFFICE')
  @Patch(':id/transfer')
  @Audit({ module: 'STUDENT', action: 'TRANSFER_SECTION', entity: 'Enrollment' })
  transfer(@Param('id') id: string, @Body() dto: TransferSectionDto) {
    return this.svc.transfer(id, dto);
  }

  @Roles('ADMIN')
  @Patch(':id/exit')
  @Audit({ module: 'STUDENT', action: 'EXIT_STUDENT', entity: 'Student' })
  exit(@Param('id') id: string, @Body() dto: ExitStudentDto) { return this.svc.exit(id, dto); }
}
