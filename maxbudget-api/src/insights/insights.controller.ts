import { Controller, Get, Query } from '@nestjs/common';
import { InsightsService } from './insights.service';

@Controller('api/insights')
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get()
  get(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.getInsights(
      year ? parseInt(year, 10) : undefined,
      month ? parseInt(month, 10) : undefined,
    );
  }
}
