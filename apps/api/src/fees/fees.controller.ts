import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { FeesService } from './fees.service';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { AssignFeeDto, CollectDto, CreateFeeHeadDto, CreateStructureDto } from './dto';

@Controller('fees')
export class FeesController {
  constructor(private svc: FeesService) {}

  @Get('heads') heads() { return this.svc.heads(); }

  @Roles('ACCOUNTANT', 'ADMIN')
  @Post('heads')
  @Audit({ module: 'FEES', action: 'CREATE_FEE_HEAD', entity: 'FeeHead' })
  createHead(@Body() dto: CreateFeeHeadDto) { return this.svc.createHead(dto); }

  @Get('structures') structures() { return this.svc.structures(); }

  @Roles('ACCOUNTANT', 'ADMIN')
  @Post('structures')
  @Audit({ module: 'FEES', action: 'CREATE_STRUCTURE', entity: 'FeeStructure' })
  createStructure(@Body() dto: CreateStructureDto) { return this.svc.createStructure(dto); }

  @Roles('ACCOUNTANT', 'ADMIN')
  @Post('assign')
  @Audit({ module: 'FEES', action: 'ASSIGN_FEE', entity: 'StudentFee' })
  assign(@Body() dto: AssignFeeDto) { return this.svc.assign(dto); }

  @Roles('ACCOUNTANT', 'ADMIN', 'OFFICE')
  @Post('collect')
  @Audit({ module: 'FEES', action: 'COLLECT_FEE', entity: 'FeePayment' })
  collect(@CurrentUser() user: AuthUser, @Body() dto: CollectDto) { return this.svc.collect(user, dto); }

  @Roles('ACCOUNTANT', 'ADMIN')
  @Patch('receipts/:id/cancel')
  @Audit({ module: 'FEES', action: 'CANCEL_RECEIPT', entity: 'FeePayment' })
  cancel(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.svc.cancelReceipt(id, body.reason);
  }

  @Get('dues')
  dues(@Query('sectionId') sectionId?: string) { return this.svc.dues(sectionId); }

  @Get('summary')
  summary() { return this.svc.collectionSummary(); }

  @Get('student/:studentId')
  studentFees(@Param('studentId') studentId: string) { return this.svc.studentFees(studentId); }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.svc.studentFees(user.role === 'STUDENT' ? user.studentId : user.guardianOfIds?.[0]);
  }
}
