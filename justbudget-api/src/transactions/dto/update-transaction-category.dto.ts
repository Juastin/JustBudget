import { IsNumber } from 'class-validator';

export class UpdateTransactionCategoryDto {
  @IsNumber()
  categoryId: number;
}
