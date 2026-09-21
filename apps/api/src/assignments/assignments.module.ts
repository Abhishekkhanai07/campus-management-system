import { Module } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { AcademicModule } from '../academic/academic.module';

@Module({ imports: [AcademicModule], controllers: [AssignmentsController], providers: [AssignmentsService] })
export class AssignmentsModule {}
