import { IsBoolean, IsEmail, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateStaffDto {
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() qualification?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() departmentId?: string;
  @IsOptional() @IsBoolean() isTeaching?: boolean;
  @IsOptional() @IsInt() maxPeriodsPerDay?: number;
  @IsOptional() @IsInt() maxPeriodsPerWeek?: number;
  @IsOptional() @IsString() role?: any; // TEACHER | HOD | ACCOUNTANT | OFFICE | ADMIN
}
