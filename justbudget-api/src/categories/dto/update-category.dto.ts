import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCategoryDto {
  @IsString() @IsOptional() @MaxLength(100)
  name?: string;

  @IsString() @IsOptional() @MaxLength(500)
  description?: string;

  @IsString() @IsOptional()
  color?: string;
}
