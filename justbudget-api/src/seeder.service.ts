import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CategoryRule } from './entities/category-rule.entity';
import { BudgetsService } from './budgets/budgets.service';

const DEFAULT_CATEGORIES = [
  { name: 'Salaris', color: '#10b981' },
  { name: 'Hypotheek', color: '#3b82f6' },
  { name: 'Boodschappen', color: '#22c55e' },
  { name: 'Water & Elektra', color: '#eab308' },
  { name: 'Internet', color: '#8b5cf6' },
  { name: 'Mobiele telefoon', color: '#ec4899' },
  { name: 'Uit eten', color: '#f59e0b' },
  { name: 'Auto', color: '#ef4444' },
  { name: 'Winkelen', color: '#6366f1' },
  { name: 'Entertainment', color: '#14b8a6' },
  { name: 'Verzekeringen', color: '#0ea5e9' },
  { name: 'Belastingen', color: '#f97316' },
  { name: 'Overboekingen', color: '#6b7280' },
];

const DEFAULT_RULES: { keyword: string; categoryName: string }[] = [
  { keyword: 'albert heijn', categoryName: 'Boodschappen' },
  { keyword: 'jumbo', categoryName: 'Boodschappen' },
  { keyword: 'lidl', categoryName: 'Boodschappen' },
  { keyword: 'aldi', categoryName: 'Boodschappen' },
  { keyword: 'netflix', categoryName: 'Entertainment' },
  { keyword: 'spotify', categoryName: 'Entertainment' },
  { keyword: 'shell', categoryName: 'Auto' },
  { keyword: 'bp ', categoryName: 'Auto' },
  { keyword: 'hypotheek', categoryName: 'Hypotheek' },
  { keyword: 'essent', categoryName: 'Water & Elektra' },
  { keyword: 'ziggo', categoryName: 'Internet' },
  { keyword: 't-mobile', categoryName: 'Mobiele telefoon' },
  { keyword: 'vodafone', categoryName: 'Mobiele telefoon' },
  { keyword: 'salaris', categoryName: 'Salaris' },
];

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(CategoryRule) private readonly ruleRepo: Repository<CategoryRule>,
    private readonly budgetsService: BudgetsService,
  ) {}

  async onApplicationBootstrap() {
    await this.seedCategories();
    await this.seedRules();
    await this.budgetsService.ensureBudgets();
  }

  private async seedCategories() {
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = await this.categoryRepo.findOneBy({ name: cat.name });
      if (!exists) {
        await this.categoryRepo.save(this.categoryRepo.create(cat));
        this.logger.log(`Seeded category: ${cat.name}`);
      }
    }
  }

  private async seedRules() {
    for (const rule of DEFAULT_RULES) {
      const exists = await this.ruleRepo.findOneBy({ keyword: rule.keyword });
      if (exists) continue;
      const cat = await this.categoryRepo.findOneBy({ name: rule.categoryName });
      if (!cat) continue;
      await this.ruleRepo.save(this.ruleRepo.create({ keyword: rule.keyword, categoryId: cat.id, category: cat }));
      this.logger.log(`Seeded rule: ${rule.keyword} → ${rule.categoryName}`);
    }
  }

}
