import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiToolsService } from './ai.tools';
import { AcademicModule } from '../academic/academic.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { LeavesModule } from '../leaves/leaves.module';

@Module({
  imports: [AcademicModule, AttendanceModule, DashboardModule, LeavesModule],
  controllers: [AiController],
  providers: [AiService, AiToolsService],
})
export class AiModule {}
