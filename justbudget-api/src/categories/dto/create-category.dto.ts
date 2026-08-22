import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @MaxLength(100)
  name: string;

  @IsString() @IsOptional() @MaxLength(500)
  description?: string;

  @IsString() @IsOptional()
  color?: string;

  @IsNumber() @IsOptional() @Min(0)
  budgetAmount?: number;
}
