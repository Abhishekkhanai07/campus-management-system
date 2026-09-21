import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CreateAssignmentDto, EvaluateDto, MarkOfflineDto, SubmitDto } from './dto';

@Controller('assignments')
export class AssignmentsController {
  constructor(private svc: AssignmentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('sectionId') sectionId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.svc.list(user, { sectionId, subjectId });
  }

  @Roles('ADMIN', 'HOD')
  @Get('report/compliance')
  compliance() { return this.svc.compliance(); }

  @Get(':id')
  detail(@Param('id') id: string) { return this.svc.detail(id); }

  @Roles('TEACHER', 'HOD', 'ADMIN')
  @Post()
  @Audit({ module: 'ASSIGNMENT', action: 'CREATE_ASSIGNMENT', entity: 'Assignment' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateAssignmentDto) {
    return this.svc.create(user, dto);
  }

  @Roles('STUDENT')
  @Post(':id/submit')
  @Audit({ module: 'ASSIGNMENT', action: 'SUBMIT_ASSIGNMENT', entity: 'AssignmentSubmission' })
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitDto) {
    return this.svc.submit(user, id, dto);
  }

  @Roles('TEACHER', 'HOD', 'ADMIN')
  @Post(':id/offline-submission')
  @Audit({ module: 'ASSIGNMENT', action: 'MARK_OFFLINE_SUBMISSION', entity: 'AssignmentSubmission' })
  markOffline(@Param('id') id: string, @Body() dto: MarkOfflineDto) {
    return this.svc.markOffline(id, dto);
  }

  @Roles('TEACHER', 'HOD', 'ADMIN')
  @Patch('submissions/:id/evaluate')
  @Audit({ module: 'ASSIGNMENT', action: 'EVALUATE_SUBMISSION', entity: 'AssignmentSubmission' })
  evaluate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: EvaluateDto) {
    return this.svc.evaluate(user, id, dto);
  }
}
