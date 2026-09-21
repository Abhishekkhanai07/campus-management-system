import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAssignmentDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsString() subjectId: string;
  @IsString() sectionId: string;
  @IsDateString() dueDate: string;
  @IsOptional() @IsInt() maxMarks?: number;
  @IsOptional() @IsString() attachmentUrl?: string;
}

export class SubmitDto {
  @IsOptional() @IsString() content?: string;
  @IsOptional() @IsString() fileUrl?: string;
}

export class EvaluateDto {
  @IsOptional() marks?: number;
  @IsOptional() @IsString() remark?: string;
  @IsOptional() @IsString() status?: string; // EVALUATED | RETURNED
}

export class MarkOfflineDto {
  @IsString() studentId: string;
  @IsOptional() @IsString() remark?: string;
}
