import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { UpdatePeriodSettingsDto } from './dto/update-period-settings.dto';
import { UpdatePeriodBoundariesDto } from './dto/update-period-boundaries.dto';

@Controller('api')
export class PeriodsController {
  constructor(private readonly service: PeriodsService) {}

  @Get('period-settings')
  getSettings() { return this.service.getSettingsView(); }

  @Put('period-settings')
  updateSettings(@Body() dto: UpdatePeriodSettingsDto) { return this.service.updateSettings(dto); }

  @Get('periods/trigger-candidates')
  getTriggerCandidates() { return this.service.getTriggerCandidates(); }

  @Get('periods/current')
  getCurrent() { return this.service.getPeriod(); }

  @Get('periods/adjacent')
  getAdjacent(@Query('start') start: string, @Query('direction') direction: 'prev' | 'next') {
    return this.service.getAdjacentPeriod(start, direction);
  }

  @Get('periods/all')
  listPeriods() { return this.service.listPeriodsWithTransactions(); }

  @Get('periods/boundaries')
  getBoundaries() { return this.service.getAllBoundaries(); }

  @Put('periods/boundaries')
  saveBoundaries(@Body() dto: UpdatePeriodBoundariesDto) { return this.service.saveBoundaries(dto.dates); }
}
