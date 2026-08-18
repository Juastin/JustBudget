import { IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateRuleDto {
  @IsString() @MaxLength(255)
  keyword: string;

  @IsNumber()
  categoryId: number;
}
