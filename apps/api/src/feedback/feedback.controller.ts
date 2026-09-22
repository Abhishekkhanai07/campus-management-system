import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateComplaintDto, CreateMonthlyFeedbackDto, UpdateComplaintDto } from './dto';
import { FeedbackService } from './feedback.service';

@Controller('feedback')
export class FeedbackController {
  constructor(private service: FeedbackService) {}

  @Roles('STUDENT')
  @Get('teachers')
  teachers(@CurrentUser() user: AuthUser) {
    return this.service.teachers(user);
  }

  @Roles('STUDENT')
  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.service.myFeedback(user);
  }

  @Roles('STUDENT')
  @Post('complaints')
  @Audit({ module: 'FEEDBACK', action: 'CREATE_COMPLAINT', entity: 'StudentComplaint' })
  complaint(@CurrentUser() user: AuthUser, @Body() dto: CreateComplaintDto) {
    return this.service.createComplaint(user, dto);
  }

  @Roles('STUDENT')
  @Post('monthly')
  @Audit({ module: 'FEEDBACK', action: 'SUBMIT_MONTHLY_FEEDBACK', entity: 'MonthlyClassFeedback' })
  monthly(@CurrentUser() user: AuthUser, @Body() dto: CreateMonthlyFeedbackDto) {
    return this.service.createMonthlyFeedback(user, dto);
  }

  @Roles('ADMIN', 'HOD')
  @Get('complaints')
  complaints(@CurrentUser() user: AuthUser) {
    return this.service.complaints(user);
  }

  @Roles('ADMIN', 'HOD')
  @Get('monthly')
  monthlyList(@CurrentUser() user: AuthUser) {
    return this.service.monthlyFeedback(user);
  }

  @Roles('ADMIN', 'HOD')
  @Patch('complaints/:id')
  @Audit({ module: 'FEEDBACK', action: 'UPDATE_COMPLAINT', entity: 'StudentComplaint' })
  updateComplaint(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    return this.service.updateComplaint(user, id, dto);
  }
}
