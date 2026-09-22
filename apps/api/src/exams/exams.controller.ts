import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CreateExamDto, EnterMarksDto } from './dto';

@Controller('exams')
export class ExamsController {
  constructor(private svc: ExamsService) {}

  @Get() list() { return this.svc.list(); }

  @Roles('ADMIN', 'HOD')
  @Post()
  @Audit({ module: 'EXAM', action: 'CREATE_EXAM', entity: 'Exam' })
  create(@Body() dto: CreateExamDto) { return this.svc.create(dto); }

  @Get('marks-sheet')
  marksSheet(
    @CurrentUser() user: AuthUser,
    @Query('examId') examId: string,
    @Query('sectionId') sectionId: string,
    @Query('subjectId') subjectId: string,
  ) {
    return this.svc.marksSheet(user, examId, sectionId, subjectId);
  }

  @Roles('TEACHER', 'HOD', 'ADMIN', 'SUPER_ADMIN')
  @Post('marks')
  @Audit({ module: 'EXAM', action: 'ENTER_MARKS', entity: 'Mark' })
  enterMarks(@CurrentUser() user: AuthUser, @Body() dto: EnterMarksDto) {
    return this.svc.enterMarks(user, dto);
  }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post(':id/process')
  @Audit({ module: 'EXAM', action: 'PROCESS_RESULTS', entity: 'Exam' })
  process(@Param('id') id: string) { return this.svc.processResults(id); }

  @Roles('ADMIN', 'SUPER_ADMIN')
  @Post(':id/publish')
  @Audit({ module: 'EXAM', action: 'PUBLISH_RESULT', entity: 'Exam' })
  publish(@Param('id') id: string) { return this.svc.publish(id); }

  @Get('my-results')
  myResults(@CurrentUser() user: AuthUser, @Query('studentId') studentId?: string) {
    return this.svc.myResults(user.role === 'STUDENT' ? user.studentId : studentId || user.guardianOfIds?.[0]);
  }

  @Get(':id/analysis')
  analysis(@Param('id') id: string) { return this.svc.analysis(id); }

  @Get(':id/report-card/:studentId')
  reportCard(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.svc.reportCard(id, studentId);
  }
}
