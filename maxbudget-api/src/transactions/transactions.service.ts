import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { Category } from '../entities/category.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
  ) {}

  private shape(t: Transaction) {
    return {
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      transactionDate: t.transactionDate,
      hash: t.hash,
      isRecurring: t.isRecurring,
      recurringPeriod: (t.recurringPeriod ?? 'monthly') as 'monthly' | 'yearly',
      recurringHint: t.recurringHint,
      categoryId: t.categoryId ?? undefined,
      categoryName: t.category?.name ?? undefined,
      color: t.category?.color ?? undefined,
    };
  }

  async findAll(year?: number, month?: number) {
    const qb = this.repo.createQueryBuilder('t').leftJoinAndSelect('t.category', 'category');

    if (year !== undefined && month !== undefined) {
      // Filter by pay period: 20th of start month to 19th of next month
      const start = `${year}-${String(month).padStart(2, '0')}-20`;
      const endDate = new Date(year, month, 19); // month is 1-indexed, so this is next month's 19th
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-19`;
      qb.where('t.transactionDate >= :start', { start })
        .andWhere('t.transactionDate <= :end', { end });
    } else if (year !== undefined) {
      qb.where(`strftime('%Y', t.transactionDate) = :y`, { y: String(year) });
    }

    qb.orderBy('t.transactionDate', 'DESC').addOrderBy('t.id', 'DESC');
    const rows = await qb.getMany();
    return rows.map((r) => this.shape(r));
  }

  private normalizeKey(description: string): string {
    return description.toLowerCase().trim().split(/\s+/).slice(0, 3).join(' ');
  }

  private payPeriodKey(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (d >= 20) return `${y}-${m}`;
    if (m === 1) return `${y - 1}-12`;
    return `${y}-${m - 1}`;
  }

  async detectRecurring(): Promise<void> {
    const all = await this.repo.find();
    const expenses = all.filter((t) => Number(t.amount) < 0);

    const keyToPeriods = new Map<string, Set<string>>();
    const keyToIds = new Map<string, number[]>();

    for (const tx of expenses) {
      const key = this.normalizeKey(tx.description);
      const period = this.payPeriodKey(tx.transactionDate);
      if (!keyToPeriods.has(key)) { keyToPeriods.set(key, new Set()); keyToIds.set(key, []); }
      keyToPeriods.get(key)!.add(period);
      keyToIds.get(key)!.push(tx.id);
    }

    const recurringIds = new Set<number>();
    for (const [key, periods] of keyToPeriods) {
      if (periods.size >= 2) keyToIds.get(key)!.forEach((id) => recurringIds.add(id));
    }

    const toUpdate: Transaction[] = [];
    for (const tx of expenses) {
      if (tx.isRecurring) continue; // never touch confirmed recurring
      if (recurringIds.has(tx.id) && !tx.recurringHint) {
        toUpdate.push({ ...tx, recurringHint: true });
      } else if (!recurringIds.has(tx.id) && tx.recurringHint) {
        toUpdate.push({ ...tx, recurringHint: false });
      }
    }
    if (toUpdate.length > 0) {
      await this.repo.save(toUpdate);
    }
  }

  async getRecurring(year?: number, month?: number) {
    const qb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.isRecurring = :r', { r: true })
      .andWhere("(t.recurringPeriod = 'monthly' OR t.recurringPeriod IS NULL)");

    if (year !== undefined && month !== undefined) {
      const start = `${year}-${String(month).padStart(2, '0')}-20`;
      const endDate = new Date(year, month, 19);
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-19`;
      qb.andWhere('t.transactionDate >= :start', { start })
        .andWhere('t.transactionDate <= :end', { end });
    }

    qb.orderBy('t.amount', 'ASC');
    const rows = await qb.getMany();
    const total = rows.reduce((s, t) => s + Number(t.amount), 0);
    return { transactions: rows.map((r) => this.shape(r)), total: Math.round(total * 100) / 100 };
  }

  async setRecurring(id: number, isRecurring: boolean, period: 'monthly' | 'yearly' = 'monthly') {
    const tx = await this.repo.findOne({ where: { id }, relations: ['category'] });
    if (!tx) throw new NotFoundException('Transactie niet gevonden');
    tx.isRecurring = isRecurring;
    tx.recurringHint = false;
    if (isRecurring) tx.recurringPeriod = period;
    const saved = await this.repo.save(tx);
    return this.shape(saved);
  }

  async setPeriod(id: number, period: 'monthly' | 'yearly') {
    const tx = await this.repo.findOne({ where: { id }, relations: ['category'] });
    if (!tx) throw new NotFoundException('Transactie niet gevonden');
    tx.recurringPeriod = period;
    const saved = await this.repo.save(tx);
    return this.shape(saved);
  }

  async getYearlyReservations() {
    const rows = await this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.isRecurring = :r', { r: true })
      .andWhere("t.recurringPeriod = 'yearly'")
      .orderBy('t.amount', 'ASC')
      .getMany();

    const transactions = rows.map((r) => ({
      ...this.shape(r),
      monthlyReservation: Math.round(Math.abs(Number(r.amount)) / 12 * 100) / 100,
    }));
    const totalMonthlyReservation = Math.round(transactions.reduce((s, t) => s + t.monthlyReservation, 0) * 100) / 100;
    return { transactions, totalMonthlyReservation };
  }

  async getRecurringHints(year?: number, month?: number) {
    const qb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.recurringHint = :hint', { hint: true })
      .andWhere('t.isRecurring = :r', { r: false });

    if (year !== undefined && month !== undefined) {
      const start = `${year}-${String(month).padStart(2, '0')}-20`;
      const endDate = new Date(year, month, 19);
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-19`;
      qb.andWhere('t.transactionDate >= :start', { start })
        .andWhere('t.transactionDate <= :end', { end });
    }

    qb.orderBy('t.amount', 'ASC');
    const rows = await qb.getMany();
    return rows.map((r) => this.shape(r));
  }

  async updateCategory(id: number, categoryId: number) {
    const tx = await this.repo.findOne({ where: { id }, relations: ['category'] });
    if (!tx) throw new NotFoundException('Transactie niet gevonden');
    const cat = await this.categoryRepo.findOneBy({ id: categoryId });
    if (!cat) throw new NotFoundException('Categorie niet gevonden');
    tx.categoryId = categoryId;
    tx.category = cat;
    const saved = await this.repo.save(tx);
    return this.shape(saved);
  }
}
