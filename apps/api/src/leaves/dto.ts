import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class ApplyLeaveDto {
  @IsString() leaveTypeId: string;
  @IsDateString() fromDate: string;
  @IsDateString() toDate: string;
  @IsOptional() @IsBoolean() isHalfDay?: boolean;
  @IsString() reason: string;
  @IsOptional() @IsString() staffId?: string; // admin recording leave for someone else
}

export class DecideLeaveDto {
  @IsBoolean() approve: boolean;
  @IsOptional() @IsString() remark?: string;
}

export class AssignSubstituteDto {
  @IsOptional() @IsString() substituteStaffId?: string;
  @IsOptional() @IsString() status?: string; // ASSIGNED | CANCELLED | COMBINED
  @IsOptional() @IsString() note?: string;
}
