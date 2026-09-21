import { IsDateString, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateStudentDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsOptional() @IsDateString() dob?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() address?: string;

  @IsString() sectionId: string;
  @IsOptional() @IsInt() rollNo?: number;

  // primary guardian, created together with the student
  @IsOptional() @IsString() guardianName?: string;
  @IsOptional() @IsString() guardianRelation?: string;
  @IsOptional() @IsString() guardianPhone?: string;
  @IsOptional() @IsEmail() guardianEmail?: string;
}

export class TransferSectionDto {
  @IsString() sectionId: string;
  @IsString() reason: string;
}

export class ExitStudentDto {
  @IsString() reason: string;
  @IsOptional() @IsDateString() exitDate?: string;
}

export class StudentLeaveDto {
  @IsOptional() @IsString() studentId?: string;
  @IsDateString() fromDate: string;
  @IsDateString() toDate: string;
  @IsString() reason: string;
}
