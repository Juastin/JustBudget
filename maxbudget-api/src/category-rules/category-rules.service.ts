import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoryRule } from '../entities/category-rule.entity';
import { Category } from '../entities/category.entity';
import { Transaction } from '../entities/transaction.entity';
import { CreateRuleDto } from './dto/create-rule.dto';

@Injectable()
export class CategoryRulesService {
  constructor(
    @InjectRepository(CategoryRule) private readonly repo: Repository<CategoryRule>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
  ) {}

  async findAll() {
    const rules = await this.repo.find({ relations: ['category'], order: { keyword: 'ASC' } });
    return rules.map((r) => ({
      id: r.id,
      keyword: r.keyword,
      categoryId: r.categoryId,
      categoryName: r.category?.name ?? '',
    }));
  }

  async createOrUpdate(dto: CreateRuleDto) {
    const cat = await this.categoryRepo.findOneBy({ id: dto.categoryId });
    if (!cat) throw new NotFoundException('Categorie niet gevonden');
    const keyword = dto.keyword.toLowerCase().trim();
    let rule = await this.repo.findOne({ where: { keyword }, relations: ['category'] });
    if (rule) {
      rule.categoryId = dto.categoryId;
      rule.category = cat;
    } else {
      rule = this.repo.create({ keyword, categoryId: dto.categoryId, category: cat });
    }
    const saved = await this.repo.save(rule);
    return { id: saved.id, keyword: saved.keyword, categoryId: saved.categoryId, categoryName: cat.name };
  }

  async remove(id: number): Promise<void> {
    const rule = await this.repo.findOneBy({ id });
    if (!rule) throw new NotFoundException('Regel niet gevonden');
    await this.repo.remove(rule);
  }

  async applyToAll(id: number): Promise<{ updated: number }> {
    const rule = await this.repo.findOne({ where: { id }, relations: ['category'] });
    if (!rule) throw new NotFoundException('Regel niet gevonden');

    const transactions = await this.txRepo.find();
    const keyword = rule.keyword.toLowerCase();
    const matches = transactions.filter((t) => t.description.toLowerCase().includes(keyword));

    if (matches.length > 0) {
      await this.txRepo.save(matches.map((t) => ({ ...t, categoryId: rule.categoryId })));
    }

    return { updated: matches.length };
  }

  async findMatchingCategory(description: string): Promise<Category | null> {
    const rules = await this.repo.find({ relations: ['category'] });
    const lower = description.toLowerCase();
    const match = rules.find((r) => lower.includes(r.keyword));
    return match?.category ?? null;
  }
}
