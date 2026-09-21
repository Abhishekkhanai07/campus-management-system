import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { AcademicModule } from '../academic/academic.module';

@Module({ imports: [AcademicModule], controllers: [StaffController], providers: [StaffService], exports: [StaffService] })
export class StaffModule {}
