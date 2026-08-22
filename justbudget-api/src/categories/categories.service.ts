import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Budget } from '../entities/budget.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const PALETTE = ['#3b82f6','#22c55e','#eab308','#f97316','#8b5cf6','#ec4899','#f43f5e','#f59e0b','#ef4444','#6366f1','#14b8a6','#10b981'];

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly repo: Repository<Category>,
    @InjectRepository(Budget) private readonly budgetRepo: Repository<Budget>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const existing = await this.repo.findOneBy({ name: dto.name });
    if (existing) throw new ConflictException('Categorie bestaat al');
    const count = await this.repo.count();
    const color = dto.color ?? PALETTE[count % PALETTE.length];
    const cat = await this.repo.save(this.repo.create({ ...dto, color }));

    // Always create a matching budget for the new category
    const existingBudget = await this.budgetRepo.findOneBy({ categoryId: cat.id });
    if (!existingBudget) {
      await this.budgetRepo.save(
        this.budgetRepo.create({ categoryId: cat.id, amount: dto.budgetAmount ?? 0 }),
      );
    }

    return cat;
  }

  async update(id: number, dto: UpdateCategoryDto): Promise<Category> {
    const cat = await this.repo.findOneBy({ id });
    if (!cat) throw new NotFoundException('Categorie niet gevonden');
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(id: number): Promise<void> {
    const cat = await this.repo.findOneBy({ id });
    if (!cat) throw new NotFoundException('Categorie niet gevonden');
    // Manually remove budget (SQLite may not enforce FK cascade)
    await this.budgetRepo.delete({ categoryId: id });
    await this.repo.remove(cat);
  }
}
