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

  private payPeriodDates(year: number, month: number): { start: string; end: string } {
    const start = `${year}-${String(month).padStart(2, '0')}-20`;
    const endDate = new Date(year, month, 19); // month is 1-indexed; JS treats it as next month (0-indexed)
    const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-19`;
    return { start, end };
  }

  private currentPeriodYearMonth(): { year: number; month: number } {
    const now = new Date();
    if (now.getDate() >= 20) return { year: now.getFullYear(), month: now.getMonth() + 1 };
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
  }

  async getProjectedRecurring(year?: number, month?: number) {
    const { year: curYear, month: curMonth } =
      year !== undefined && month !== undefined ? { year, month } : this.currentPeriodYearMonth();

    const { start: curStart, end: curEnd } = this.payPeriodDates(curYear, curMonth);

    const prevMonth = curMonth === 1 ? 12 : curMonth - 1;
    const prevYear = curMonth === 1 ? curYear - 1 : curYear;
    const { start: prevStart, end: prevEnd } = this.payPeriodDates(prevYear, prevMonth);

    const overboekingCat = await this.categoryRepo.findOneBy({ name: 'Overboekingen' });

    const prevQb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.isRecurring = :r', { r: true })
      .andWhere("(t.recurringPeriod = 'monthly' OR t.recurringPeriod IS NULL)")
      .andWhere('t.transactionDate >= :prevStart', { prevStart })
      .andWhere('t.transactionDate <= :prevEnd', { prevEnd });
    if (overboekingCat) {
      prevQb.andWhere('(t.categoryId != :ocid OR t.categoryId IS NULL)', { ocid: overboekingCat.id });
    }
    const prevRecurring = await prevQb.getMany();

    if (prevRecurring.length === 0) return [];

    const curAll = await this.repo.createQueryBuilder('t')
      .where('t.transactionDate >= :curStart', { curStart })
      .andWhere('t.transactionDate <= :curEnd', { curEnd })
      .getMany();

    const curKeys = new Set(curAll.map((t) => this.normalizeKey(t.description)));

    return prevRecurring
      .filter((t) => !curKeys.has(this.normalizeKey(t.description)))
      .map((t) => ({ ...this.shape(t), isProjected: true }));
  }

  async findRecurringByDescription(description: string): Promise<Transaction | null> {
    const key = this.normalizeKey(description);
    const candidates = await this.repo.find({ where: { isRecurring: true } });
    return candidates.find((t) => this.normalizeKey(t.description) === key) ?? null;
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
