import { ArrayMinSize, IsArray, IsString, Matches } from 'class-validator';

export class UpdatePeriodBoundariesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { each: true })
  dates: string[];
}
