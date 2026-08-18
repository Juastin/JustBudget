import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Depreciation } from '../entities/depreciation.entity';
import { CreateDepreciationDto, UpdateDepreciationDto } from './dto/depreciation.dto';

@Injectable()
export class DepreciationsService {
  constructor(@InjectRepository(Depreciation) private readonly repo: Repository<Depreciation>) {}

  private shape(d: Depreciation) {
    const net = Number(d.buyPrice) - Number(d.residualValue ?? 0);
    const monthlyAmount = net / d.lifespanMonths;

    let alreadyDepreciated: number | null = null;
    if (d.buyDate) {
      const now = new Date();
      const buy = new Date(d.buyDate);
      const monthsElapsed = (now.getFullYear() - buy.getFullYear()) * 12 + (now.getMonth() - buy.getMonth());
      const capped = Math.max(0, Math.min(monthsElapsed, d.lifespanMonths));
      alreadyDepreciated = Math.round(capped * monthlyAmount * 100) / 100;
    }

    return {
      id: d.id,
      name: d.name,
      buyPrice: Number(d.buyPrice),
      residualValue: Number(d.residualValue ?? 0),
      lifespanMonths: d.lifespanMonths,
      category: d.category ?? 'Overig',
      buyDate: d.buyDate ?? null,
      monthlyAmount,
      alreadyDepreciated,
    };
  }

  async findAll() {
    return (await this.repo.find({ order: { category: 'ASC', name: 'ASC' } })).map((d) => this.shape(d));
  }

  async getSummary() {
    const all = await this.findAll();
    const totalMonthly = all.reduce((s, d) => s + d.monthlyAmount, 0);

    const categoryMap = new Map<string, ReturnType<typeof this.shape>[]>();
    for (const item of all) {
      if (!categoryMap.has(item.category)) categoryMap.set(item.category, []);
      categoryMap.get(item.category)!.push(item);
    }

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, items]) => ({
        category,
        monthlyAmount: items.reduce((s, d) => s + d.monthlyAmount, 0),
        items,
      }))
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    const totalShouldHaveSaved = all.reduce((s, d) => s + (d.alreadyDepreciated ?? 0), 0);

    return { totalMonthly, totalShouldHaveSaved, byCategory };
  }

  async create(dto: CreateDepreciationDto) {
    const dep = this.repo.create(dto);
    return this.shape(await this.repo.save(dep));
  }

  async update(id: number, dto: UpdateDepreciationDto) {
    const dep = await this.repo.findOneBy({ id });
    if (!dep) throw new NotFoundException('Afschrijving niet gevonden');
    Object.assign(dep, dto);
    return this.shape(await this.repo.save(dep));
  }

  async remove(id: number) {
    const dep = await this.repo.findOneBy({ id });
    if (!dep) throw new NotFoundException('Afschrijving niet gevonden');
    await this.repo.remove(dep);
  }
}
