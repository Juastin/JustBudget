import { Body, Controller, Get, Param, ParseIntPipe, Put, Query } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('api')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Get('budgets')
  findAll() {
    return this.service.findAll();
  }

  @Get('budget-status')
  getStatus(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.getBudgetStatus(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('budget-summary')
  getSummary(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.getBudgetSummary(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }

  @Get('budget-averages')
  getAverages(@Query('year') year?: string) {
    return this.service.getYearlyAverages(year ? parseInt(year, 10) : undefined);
  }

  @Put('budgets/:id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBudgetDto) {
    return this.service.update(id, dto);
  }
}
