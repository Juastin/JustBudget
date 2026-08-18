import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { TransactionsService } from './transactions.service';
import { UpdateTransactionCategoryDto } from './dto/update-transaction-category.dto';

class UpdateRecurringDto {
  @IsBoolean() isRecurring: boolean;
  @IsString() @IsIn(['monthly', 'yearly']) @IsOptional() period?: 'monthly' | 'yearly';
}

class UpdatePeriodDto {
  @IsString() @IsIn(['monthly', 'yearly']) period: 'monthly' | 'yearly';
}

@Controller('api/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  findAll(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.findAll(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('recurring')
  getRecurring(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.getRecurring(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('reservations')
  getYearlyReservations() {
    return this.service.getYearlyReservations();
  }

  @Get('hints')
  getRecurringHints(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.getRecurringHints(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Post('detect-recurring') @HttpCode(200)
  detectRecurring() {
    return this.service.detectRecurring();
  }

  @Put(':id/category')
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTransactionCategoryDto) {
    return this.service.updateCategory(id, dto.categoryId);
  }

  @Patch(':id/recurring')
  setRecurring(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRecurringDto) {
    return this.service.setRecurring(id, dto.isRecurring, dto.period);
  }

  @Patch(':id/period')
  setPeriod(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePeriodDto) {
    return this.service.setPeriod(id, dto.period);
  }
}
