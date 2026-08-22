import { IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { ReservationType } from '../../entities/reservation.entity';

export class CreateReservationDto {
  @IsString()
  name: string;

  @IsIn(['afschrijving', 'terugkerend', 'eenmalig'])
  type: ReservationType;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  residualValue?: number | null;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  intervalMonths: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  startDate?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  savedAmount?: number;
}

export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsIn(['afschrijving', 'terugkerend', 'eenmalig'])
  type?: ReservationType;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  residualValue?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  intervalMonths?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  startDate?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  savedAmount?: number;
}
