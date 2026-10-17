import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UiSettings } from '../entities/ui-settings.entity';
import { UpdateUiSettingsDto } from './dto/update-ui-settings.dto';

const DEFAULT_SPOTLIGHT = ['Uit eten', 'Boodschappen'];
const DEFAULT_INSIGHT_OPTIONS: Record<string, boolean> = {
  overBudgetCategories: true,
  warnThreshold: true,
  paidNotifications: true,
  totalUnderBudget: true,
  totalOverBudget: true,
};

@Injectable()
export class UiSettingsService {
  constructor(@InjectRepository(UiSettings) private readonly repo: Repository<UiSettings>) {}

  private async getRow(): Promise<UiSettings> {
    let row = await this.repo.find({ take: 1 }).then((rows) => rows[0]);
    if (!row) {
      row = await this.repo.save(this.repo.create());
    }
    return row;
  }

  async getSettings() {
    const row = await this.getRow();
    return {
      spotlightCategories: JSON.parse(row.spotlightCategories) as string[],
      insightOptions: { ...DEFAULT_INSIGHT_OPTIONS, ...JSON.parse(row.insightOptions) },
    };
  }

  async updateSettings(dto: UpdateUiSettingsDto) {
    const row = await this.getRow();
    if (dto.spotlightCategories) {
      row.spotlightCategories = JSON.stringify(dto.spotlightCategories);
    }
    if (dto.insightOptions) {
      const current = JSON.parse(row.insightOptions);
      row.insightOptions = JSON.stringify({ ...current, ...dto.insightOptions });
    }
    await this.repo.save(row);
    return this.getSettings();
  }
}
