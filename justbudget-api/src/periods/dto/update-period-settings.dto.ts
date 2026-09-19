import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PeriodMode } from '../../entities/period-settings.entity';

export class UpdatePeriodSettingsDto {
  @IsIn(['FIXED_DAY', 'TRANSACTION'])
  mode: PeriodMode;

  @IsInt() @Min(1) @Max(31)
  anchorDay: number;

  @IsOptional() @IsString() @MaxLength(200)
  triggerDescription?: string;
}
