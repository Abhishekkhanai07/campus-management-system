import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private svc: UsersService) {}

  @Get()
  list(@Query('role') role?: string, @Query('q') q?: string) { return this.svc.list({ role, q }); }

  @Get('login-history')
  loginHistory() { return this.svc.loginHistory(); }

  @Patch(':id/active')
  @Audit({ module: 'USER', action: 'SET_USER_ACTIVE', entity: 'User' })
  setActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.svc.setActive(id, body.isActive);
  }

  @Post(':id/reset-password')
  @Audit({ module: 'USER', action: 'RESET_PASSWORD', entity: 'User' })
  reset(@Param('id') id: string) { return this.svc.resetPassword(id); }
}
