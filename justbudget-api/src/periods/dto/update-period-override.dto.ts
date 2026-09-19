import { IsOptional, IsString } from 'class-validator';

export class UpdatePeriodOverrideDto {
  @IsString()
  customStart: string;

  @IsOptional()
  @IsString()
  customEnd?: string | null;
}
