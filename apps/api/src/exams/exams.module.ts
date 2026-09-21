import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { AcademicModule } from '../academic/academic.module';

@Module({ imports: [AcademicModule], controllers: [ExamsController], providers: [ExamsService] })
export class ExamsModule {}
