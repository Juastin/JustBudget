import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reservation } from '../entities/reservation.entity';
import { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(@InjectRepository(Reservation) private readonly repo: Repository<Reservation>) {}

  private fmt = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

  private monthsElapsed(dateStr: string): number {
    const start = new Date(dateStr);
    const now = new Date();
    return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  }

  private shape(r: Reservation) {
    const amount = Number(r.amount);
    const residualValue = r.residualValue !== null ? Number(r.residualValue) : null;
    const savedAmount = Number(r.savedAmount ?? 0);

    let monthlyAmount: number;
    let progress: number | null = null;
    let progressLabel: string | null = null;

    if (r.type === 'afschrijving') {
      const net = amount - (residualValue ?? 0);
      monthlyAmount = r.intervalMonths > 0 ? net / r.intervalMonths : 0;
      if (r.startDate && net > 0) {
        const elapsed = Math.max(0, Math.min(this.monthsElapsed(r.startDate), r.intervalMonths));
        const alreadySet = Math.round(elapsed * monthlyAmount * 100) / 100;
        progress = Math.min(100, Math.round((alreadySet / net) * 100));
        progressLabel = `${this.fmt.format(alreadySet)} afgeschreven`;
      }
    } else if (r.type === 'terugkerend') {
      monthlyAmount = r.intervalMonths > 0 ? amount / r.intervalMonths : 0;
      if (r.startDate) {
        const elapsed = this.monthsElapsed(r.startDate);
        const withinCycle = ((elapsed % r.intervalMonths) + r.intervalMonths) % r.intervalMonths;
        const monthsUntilNext = withinCycle === 0 ? 0 : r.intervalMonths - withinCycle;
        progress = Math.min(100, Math.round((withinCycle / r.intervalMonths) * 100));
        progressLabel = monthsUntilNext === 0 ? 'Nu verwacht' : `${monthsUntilNext} mnd tot volgende`;
      }
    } else {
      const remaining = Math.max(0, amount - savedAmount);
      monthlyAmount = r.intervalMonths > 0 ? remaining / r.intervalMonths : 0;
      progress = amount > 0 ? Math.min(100, Math.round((savedAmount / amount) * 100)) : 0;
      progressLabel = `${this.fmt.format(savedAmount)} gespaard`;
    }

    return {
      id: r.id,
      name: r.name,
      type: r.type,
      category: r.category ?? 'Overig',
      amount,
      residualValue,
      intervalMonths: r.intervalMonths,
      startDate: r.startDate ?? null,
      savedAmount,
      monthlyAmount: Math.round(monthlyAmount * 100) / 100,
      progress,
      progressLabel,
    };
  }

  async findAll() {
    return (await this.repo.find({ order: { category: 'ASC', name: 'ASC' } })).map((r) => this.shape(r));
  }

  async getSummary() {
    const all = await this.findAll();
    const totalMonthly = Math.round(all.reduce((s, r) => s + r.monthlyAmount, 0) * 100) / 100;

    const categoryMap = new Map<string, ReturnType<typeof this.shape>[]>();
    for (const item of all) {
      if (!categoryMap.has(item.category)) categoryMap.set(item.category, []);
      categoryMap.get(item.category)!.push(item);
    }

    const byCategory = Array.from(categoryMap.entries())
      .map(([category, items]) => ({
        category,
        monthlyAmount: Math.round(items.reduce((s, r) => s + r.monthlyAmount, 0) * 100) / 100,
        items,
      }))
      .sort((a, b) => b.monthlyAmount - a.monthlyAmount);

    return { totalMonthly, byCategory };
  }

  async create(dto: CreateReservationDto) {
    const r = this.repo.create({
      ...dto,
      category: dto.category?.trim() || 'Overig',
      residualValue: dto.residualValue ?? null,
      savedAmount: dto.savedAmount ?? 0,
      startDate: dto.startDate ?? null,
    });
    return this.shape(await this.repo.save(r));
  }

  async update(id: number, dto: UpdateReservationDto) {
    const r = await this.repo.findOneBy({ id });
    if (!r) throw new NotFoundException('Reservering niet gevonden');
    Object.assign(r, dto);
    if (dto.category !== undefined) r.category = dto.category?.trim() || 'Overig';
    return this.shape(await this.repo.save(r));
  }

  async remove(id: number) {
    const r = await this.repo.findOneBy({ id });
    if (!r) throw new NotFoundException('Reservering niet gevonden');
    await this.repo.remove(r);
  }
}
