import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsNumber()
  amount: number;

  @IsOptional() @IsBoolean()
  notifyPaid?: boolean;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  warnThreshold?: number | null;
}
