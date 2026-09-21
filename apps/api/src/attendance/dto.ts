import { IsArray, IsDateString, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkRow {
  @IsString() studentId: string;
  @IsString() status: string; // PRESENT | ABSENT | LATE | HALF_DAY | ON_LEAVE | ON_DUTY
  @IsOptional() @IsString() remark?: string;
}

export class MarkDailyDto {
  @IsString() sectionId: string;
  @IsDateString() date: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => MarkRow) rows: MarkRow[];
}

export class MarkPeriodDto {
  @IsString() slotId: string;
  @IsDateString() date: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => MarkRow) rows: MarkRow[];
}

export class CorrectionDto {
  @IsString() kind: string; // DAILY | PERIOD
  @IsString() recordId: string;
  @IsString() newValue: string;
  @IsString() reason: string;
}
