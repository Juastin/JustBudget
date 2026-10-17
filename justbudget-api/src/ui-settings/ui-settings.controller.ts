import { Body, Controller, Get, Put } from '@nestjs/common';
import { UiSettingsService } from './ui-settings.service';
import { UpdateUiSettingsDto } from './dto/update-ui-settings.dto';

@Controller('api/ui-settings')
export class UiSettingsController {
  constructor(private readonly service: UiSettingsService) {}

  @Get()
  get() {
    return this.service.getSettings();
  }

  @Put()
  update(@Body() dto: UpdateUiSettingsDto) {
    return this.service.updateSettings(dto);
  }
}
