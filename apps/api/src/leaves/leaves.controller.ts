import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { ApplyLeaveDto, AssignSubstituteDto, DecideLeaveDto } from './dto';

@Controller('leaves')
export class LeavesController {
  constructor(private svc: LeavesService) {}

  @Get('types') types() { return this.svc.types(); }

  @Get('balances')
  balances(@CurrentUser() user: AuthUser, @Query('staffId') staffId?: string) {
    return this.svc.balances(staffId || user.staffId);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) { return this.svc.myApplications(user.staffId); }

  @Post()
  @Audit({ module: 'LEAVE', action: 'APPLY_LEAVE', entity: 'LeaveApplication' })
  apply(@CurrentUser() user: AuthUser, @Body() dto: ApplyLeaveDto) {
    return this.svc.apply(user, dto);
  }

  @Roles('ADMIN', 'HOD')
  @Get('pending')
  pending(@CurrentUser() user: AuthUser) { return this.svc.pending(user); }

  @Roles('ADMIN', 'HOD')
  @Patch(':id/decision')
  @Audit({ module: 'LEAVE', action: 'DECIDE_LEAVE', entity: 'LeaveApplication' })
  decide(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DecideLeaveDto) {
    return this.svc.decide(user, id, dto);
  }

  // ---- substitution
  @Get('substitutions/board')
  board(@Query('date') date?: string) { return this.svc.board(date); }

  @Get('substitutions/:id/suggestions')
  suggestions(@Param('id') id: string) { return this.svc.suggestions(id); }

  @Roles('ADMIN', 'HOD')
  @Patch('substitutions/:id')
  @Audit({ module: 'SUBSTITUTION', action: 'ASSIGN_SUBSTITUTE', entity: 'Substitution' })
  assign(@Param('id') id: string, @Body() dto: AssignSubstituteDto) { return this.svc.assign(id, dto); }

  @Get('substitutions/mine')
  myDuties(@CurrentUser() user: AuthUser, @Query('date') date?: string) {
    return this.svc.myDuties(user.staffId, date);
  }

  @Roles('ADMIN', 'HOD')
  @Get('substitutions/report/load')
  loadReport(@Query('from') from: string, @Query('to') to: string) {
    return this.svc.loadReport(from, to);
  }
}
