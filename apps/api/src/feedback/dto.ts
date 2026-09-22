import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateComplaintDto {
  @IsString()
  teacherId!: string;

  @IsString()
  subject!: string;

  @IsString()
  description!: string;
}

export class CreateMonthlyFeedbackDto {
  @IsDateString()
  month!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class UpdateComplaintDto {
  @IsString()
  status!: string;

  @IsOptional()
  @IsString()
  response?: string;
}
