import { Module } from '@nestjs/common';
import { FeesService } from './fees.service';
import { FeesController } from './fees.controller';
import { AcademicModule } from '../academic/academic.module';

@Module({ imports: [AcademicModule], controllers: [FeesController], providers: [FeesService] })
export class FeesModule {}
