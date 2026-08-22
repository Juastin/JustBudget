import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSavingsGoalDto {
  @IsString() name: string;
  @IsNumber() @Min(0) targetAmount: number;
  @IsNumber() @Min(0) @IsOptional() reservedAmount?: number;
}

export class UpdateSavingsGoalDto {
  @IsString() @IsOptional() name?: string;
  @IsNumber() @Min(0) @IsOptional() targetAmount?: number;
  @IsNumber() @Min(0) @IsOptional() reservedAmount?: number;
}
