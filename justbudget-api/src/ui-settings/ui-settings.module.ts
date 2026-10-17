import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UiSettings } from '../entities/ui-settings.entity';
import { UiSettingsController } from './ui-settings.controller';
import { UiSettingsService } from './ui-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([UiSettings])],
  controllers: [UiSettingsController],
  providers: [UiSettingsService],
})
export class UiSettingsModule {}
