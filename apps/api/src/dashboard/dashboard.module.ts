import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AcademicModule } from '../academic/academic.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { StaffModule } from '../staff/staff.module';

@Module({
  imports: [AcademicModule, AttendanceModule, StaffModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
