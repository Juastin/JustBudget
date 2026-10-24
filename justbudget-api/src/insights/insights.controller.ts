import { Controller, Get, Query } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Controller('api/insights')
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get()
  get(@Query('periodStart') periodStart?: string) {
    return this.service.getInsights(periodStart);
  }

  @Get('yearly-trend')
  getYearlyTrend(@Query('year') year?: string) {
    return this.service.getYearlyTrend(year ? Number(year) : new Date().getFullYear());
  }
}
