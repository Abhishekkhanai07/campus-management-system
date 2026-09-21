import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CorrectionDto, MarkDailyDto, MarkPeriodDto } from './dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private svc: AttendanceService) {}

  @Get('daily/roster')
  dailyRoster(
    @CurrentUser() user: AuthUser,
    @Query('sectionId') sectionId: string,
    @Query('date') date: string,
  ) {
    return this.svc.dailyRoster(user, sectionId, date);
  }

  @Roles('ADMIN', 'TEACHER', 'HOD')
  @Post('daily')
  @Audit({ module: 'ATTENDANCE', action: 'MARK_DAILY', entity: 'DailyAttendance' })
  markDaily(@CurrentUser() user: AuthUser, @Body() dto: MarkDailyDto) {
    return this.svc.markDaily(user, dto);
  }

  @Get('period/roster')
  periodRoster(
    @CurrentUser() user: AuthUser,
    @Query('slotId') slotId: string,
    @Query('date') date: string,
  ) {
    return this.svc.periodRoster(user, slotId, date);
  }

  @Roles('ADMIN', 'TEACHER', 'HOD')
  @Post('period')
  @Audit({ module: 'ATTENDANCE', action: 'MARK_PERIOD', entity: 'PeriodAttendance' })
  markPeriod(@CurrentUser() user: AuthUser, @Body() dto: MarkPeriodDto) {
    return this.svc.markPeriod(user, dto);
  }

  @Get('report/section')
  sectionReport(
    @Query('sectionId') sectionId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.svc.sectionReport(sectionId, from, to);
  }

  @Get('report/register')
  register(@Query('sectionId') sectionId: string, @Query('month') month: string) {
    return this.svc.register(sectionId, month);
  }

  @Get('report/defaulters')
  defaulters(@Query('sectionId') sectionId?: string) { return this.svc.defaulters(sectionId); }

  @Get('report/not-marked')
  notMarked(@Query('date') date?: string) { return this.svc.notMarked(date); }

  @Get('report/today')
  today(@Query('date') date?: string) { return this.svc.todaySummary(date); }

  @Get('me')
  me(@CurrentUser() user: AuthUser, @Query('studentId') studentId?: string) {
    return this.svc.myAttendance(user.role === 'STUDENT' ? user.studentId : studentId || user.guardianOfIds?.[0]);
  }

  @Post('corrections')
  @Audit({ module: 'ATTENDANCE', action: 'REQUEST_CORRECTION', entity: 'AttendanceCorrection' })
  requestCorrection(@CurrentUser() user: AuthUser, @Body() dto: CorrectionDto) {
    return this.svc.requestCorrection(user, dto);
  }

  @Roles('ADMIN', 'HOD')
  @Get('corrections/pending')
  pendingCorrections() { return this.svc.pendingCorrections(); }

  @Roles('ADMIN', 'HOD')
  @Patch('corrections/:id')
  @Audit({ module: 'ATTENDANCE', action: 'DECIDE_CORRECTION', entity: 'AttendanceCorrection' })
  decideCorrection(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: { approve: boolean },
  ) {
    return this.svc.decideCorrection(user, id, body.approve);
  }
}
