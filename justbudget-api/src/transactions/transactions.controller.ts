import { Body, Controller, Get, Param, ParseIntPipe, Patch, Put, Query } from '@nestjs/common';
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Matches } from 'class-validator';
import { TransactionsService } from './transactions.service';
import { UpdateTransactionCategoryDto } from './dto/update-transaction-category.dto';

class UpdateRecurringDto {
  @IsBoolean() isRecurring: boolean;
  @IsString() @IsIn(['monthly', 'yearly']) @IsOptional() period?: 'monthly' | 'yearly';
}

class UpdatePeriodDto {
  @IsString() @IsIn(['monthly', 'yearly']) period: 'monthly' | 'yearly';
}

class UpdateDateDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/) @IsDateString({ strict: true }) transactionDate: string;
}

class LinkTransactionDto {
  @IsInt() expenseId: number;
}

@Controller('api/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  findAll(@Query('periodStart') periodStart?: string) {
    return this.service.findAll(periodStart);
  }

  @Get('recurring')
  getRecurring(@Query('periodStart') periodStart?: string) {
    return this.service.getRecurring(periodStart);
  }

  @Get('reservations')
  getYearlyReservations() {
    return this.service.getYearlyReservations();
  }

  @Get('projected')
  getProjectedRecurring(@Query('periodStart') periodStart?: string) {
    return this.service.getProjectedRecurring(periodStart);
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

  @Patch(':id/date')
  setDate(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDateDto) {
    return this.service.updateDate(id, dto.transactionDate);
  }

  @Patch(':id/link')
  link(@Param('id', ParseIntPipe) id: number, @Body() dto: LinkTransactionDto) {
    return this.service.linkToExpense(id, dto.expenseId);
  }

  @Patch(':id/unlink')
  unlink(@Param('id', ParseIntPipe) id: number) {
    return this.service.unlink(id);
  }
}
