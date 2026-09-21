import { IsArray, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFeeHeadDto {
  @IsString() name: string;
}

export class StructureItemDto {
  @IsString() feeHeadId: string;
  @IsNumber() amount: number;
}

export class CreateStructureDto {
  @IsString() name: string;
  @IsOptional() @IsString() classLevelId?: string;
  @IsArray() items: StructureItemDto[];
  @IsOptional() installments?: { seq: number; amount: number; dueDate: string }[];
}

export class AssignFeeDto {
  @IsString() studentId: string;
  @IsString() feeStructureId: string;
  @IsOptional() @IsNumber() concession?: number;
  @IsOptional() @IsString() concessionNote?: string;
}

export class CollectDto {
  @IsString() studentFeeId: string;
  @IsNumber() amount: number;
  @IsOptional() @IsString() mode?: string;
  @IsOptional() @IsString() reference?: string;
}
