import { IsArray, IsDateString, IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExamDto {
  @IsString() name: string;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsInt() weightagePct?: number;
  @IsOptional() @IsDateString() publishAt?: string;
}

export class MarkRowDto {
  @IsString() studentId: string;
  @IsOptional() marksObtained?: number;
  @IsOptional() @IsString() status?: string; // PRESENT | ABSENT | EXEMPTED
}

export class EnterMarksDto {
  @IsString() examId: string;
  @IsString() sectionId: string;
  @IsString() subjectId: string;
  @IsOptional() @IsInt() maxMarks?: number;
  @IsArray() @ValidateNested({ each: true }) @Type(() => MarkRowDto) rows: MarkRowDto[];
}
