import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsNumber() @Min(0)
  amount: number;

  @IsOptional() @IsBoolean()
  notifyPaid?: boolean;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  warnThreshold?: number | null;
}
