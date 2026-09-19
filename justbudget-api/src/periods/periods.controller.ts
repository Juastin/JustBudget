import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { PeriodsService } from './periods.service';
import { UpdatePeriodSettingsDto } from './dto/update-period-settings.dto';
import { UpdatePeriodOverrideDto } from './dto/update-period-override.dto';

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

  @Put('periods/:originalStart/adjustment')
  setAdjustment(@Param('originalStart') originalStart: string, @Body() dto: UpdatePeriodOverrideDto) {
    return this.service.setPeriodAdjustment(originalStart, dto);
  }

  @Delete('periods/:originalStart/adjustment')
  removeAdjustment(@Param('originalStart') originalStart: string) {
    return this.service.removePeriodAdjustment(originalStart);
  }
}
