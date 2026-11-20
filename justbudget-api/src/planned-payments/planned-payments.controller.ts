import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { IsDateString, IsInt, IsNotEmpty, IsNumber, IsPositive, IsString, Matches } from 'class-validator';
import { PlannedPaymentsService } from './planned-payments.service';

class CreatePlannedPaymentDto {
  @IsString() @IsNotEmpty() name: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive() amount: number;
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) dueDate: string;
}

class SettlePlannedPaymentDto {
  @IsInt() transactionId: number;
}

@Controller('api/planned-payments')
export class PlannedPaymentsController {
  constructor(private readonly service: PlannedPaymentsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('period')
  findInPeriod(@Query('periodStart') periodStart?: string) {
    return this.service.findInPeriod(periodStart);
  }

  @Get(':id/candidates')
  findCandidates(@Param('id', ParseIntPipe) id: number, @Query('search') search?: string) {
    return this.service.findCandidates(id, search);
  }

  @Post()
  create(@Body() dto: CreatePlannedPaymentDto) {
    return this.service.create(dto);
  }

  @Post(':id/settle')
  @HttpCode(204)
  settle(@Param('id', ParseIntPipe) id: number, @Body() dto: SettlePlannedPaymentDto) {
    return this.service.settle(id, dto.transactionId);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
