import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDepreciationDto {
  @IsString() name: string;
  @IsNumber() @Min(0.01) buyPrice: number;
  @IsInt() @Min(1) lifespanMonths: number;
  @IsNumber() @Min(0) @IsOptional() residualValue?: number;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() buyDate?: string;
}

export class UpdateDepreciationDto {
  @IsString() @IsOptional() name?: string;
  @IsNumber() @Min(0.01) @IsOptional() buyPrice?: number;
  @IsInt() @Min(1) @IsOptional() lifespanMonths?: number;
  @IsNumber() @Min(0) @IsOptional() residualValue?: number;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() buyDate?: string;
}
