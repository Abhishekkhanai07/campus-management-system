import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString() name: string;
  @IsDateString() startDate: string;
  @IsDateString() endDate: string;
}

export class CreateDepartmentDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() hodId?: string;
}

export class CreateClassDto {
  @IsString() name: string;
  @IsOptional() @IsInt() displayOrder?: number;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsInt() minAttendancePct?: number;
}

export class CreateSectionDto {
  @IsString() name: string;
  @IsString() classLevelId: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsString() room?: string;
  @IsOptional() @IsString() classTeacherId?: string;
}

export class CreateSubjectDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() type?: any;
  @IsOptional() @IsInt() credits?: number;
  @IsOptional() @IsInt() maxMarks?: number;
  @IsOptional() @IsInt() passMarks?: number;
  @IsOptional() @IsString() departmentId?: string;
}

export class MapClassSubjectDto {
  @IsString() classLevelId: string;
  @IsString() subjectId: string;
  @IsOptional() @IsBoolean() isElective?: boolean;
  @IsOptional() @IsInt() periodsPerWeek?: number;
}

export class AllocateDto {
  @IsString() staffId: string;
  @IsString() subjectId: string;
  @IsString() sectionId: string;
  @IsOptional() @IsBoolean() isCoTeacher?: boolean;
}

export class SlotDto {
  @IsString() sectionId: string;
  @IsString() subjectId: string;
  @IsString() staffId: string;
  @IsInt() weekday: number;
  @IsInt() periodNo: number;
  @IsString() startTime: string;
  @IsString() endTime: string;
  @IsOptional() @IsString() room?: string;
}

export class AssignClassTeacherDto {
  @IsString() staffId: string;
}

export class HolidayDto {
  @IsDateString() date: string;
  @IsString() title: string;
}
