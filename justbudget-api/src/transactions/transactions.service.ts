import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { Category } from '../entities/category.entity';
import { PeriodsService } from '../periods/periods.service';
import { normalizeKey } from '../common/normalize-key';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction) private readonly repo: Repository<Transaction>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    private readonly periodsService: PeriodsService,
  ) {}

  private shape(t: Transaction) {
    const reimbursedTotal = t.reimbursements && t.reimbursements.length > 0
      ? Math.round(t.reimbursements.reduce((s, r) => s + Number(r.amount), 0) * 100) / 100
      : undefined;
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
      linkedExpenseId: t.linkedExpenseId ?? undefined,
      linkedExpenseDescription: t.linkedExpense?.description ?? undefined,
      reimbursedTotal,
    };
  }

  private async findOneShaped(id: number) {
    const tx = await this.repo.findOne({
      where: { id },
      relations: ['category', 'linkedExpense', 'reimbursements'],
    });
    if (!tx) throw new NotFoundException('Transactie niet gevonden');
    return this.shape(tx);
  }

  async findAll(periodStart?: string) {
    const qb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .leftJoinAndSelect('t.linkedExpense', 'linkedExpense')
      .leftJoinAndSelect('t.reimbursements', 'reimbursements');

    const { start, end } = await this.periodsService.getPeriod(periodStart);
    qb.where('t.transactionDate >= :start', { start });
    if (end) qb.andWhere('t.transactionDate <= :end', { end });

    qb.orderBy('t.transactionDate', 'DESC').addOrderBy('t.id', 'DESC');
    const rows = await qb.getMany();
    return rows.map((r) => this.shape(r));
  }


  async getRecurring(periodStart?: string) {
    const qb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.isRecurring = :r', { r: true })
      .andWhere("(t.recurringPeriod = 'monthly' OR t.recurringPeriod IS NULL)");

    const { start, end } = await this.periodsService.getPeriod(periodStart);
    qb.andWhere('t.transactionDate >= :start', { start });
    if (end) qb.andWhere('t.transactionDate <= :end', { end });

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

  async getProjectedRecurring(periodStart?: string) {
    const { start: curStart, end: curEnd } = await this.periodsService.getPeriod(periodStart);
    const { start: prevStart, end: prevEnd } = await this.periodsService.getAdjacentPeriod(curStart, 'prev');

    const overboekingCat = await this.categoryRepo.findOneBy({ name: 'Overboekingen' });

    const prevQb = this.repo.createQueryBuilder('t')
      .leftJoinAndSelect('t.category', 'category')
      .where('t.isRecurring = :r', { r: true })
      .andWhere("(t.recurringPeriod = 'monthly' OR t.recurringPeriod IS NULL)")
      .andWhere('t.transactionDate >= :prevStart', { prevStart });
    if (prevEnd) prevQb.andWhere('t.transactionDate <= :prevEnd', { prevEnd });
    if (overboekingCat) {
      prevQb.andWhere('(t.categoryId != :ocid OR t.categoryId IS NULL)', { ocid: overboekingCat.id });
    }
    const prevRecurring = await prevQb.getMany();

    if (prevRecurring.length === 0) return [];

    const curAllQb = this.repo.createQueryBuilder('t')
      .where('t.transactionDate >= :curStart', { curStart });
    if (curEnd) curAllQb.andWhere('t.transactionDate <= :curEnd', { curEnd });
    const curAll = await curAllQb.getMany();

    const curKeys = new Set(curAll.map((t) => normalizeKey(t.description)));

    return prevRecurring
      .filter((t) => !curKeys.has(normalizeKey(t.description)))
      .map((t) => ({ ...this.shape(t), isProjected: true }));
  }

  async findRecurringByDescription(description: string): Promise<Transaction | null> {
    const key = normalizeKey(description);
    const candidates = await this.repo.find({ where: { isRecurring: true } });
    return candidates.find((t) => normalizeKey(t.description) === key) ?? null;
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

  async linkToExpense(id: number, expenseId: number) {
    if (id === expenseId) throw new BadRequestException('Een transactie kan niet aan zichzelf gekoppeld worden');
    const tx = await this.repo.findOneBy({ id });
    if (!tx) throw new NotFoundException('Transactie niet gevonden');
    if (Number(tx.amount) <= 0) throw new BadRequestException('Alleen een ontvangen bedrag kan gekoppeld worden aan een uitgave');

    const expense = await this.repo.findOneBy({ id: expenseId });
    if (!expense) throw new NotFoundException('Uitgave niet gevonden');
    if (Number(expense.amount) >= 0) throw new BadRequestException('De gekoppelde transactie moet een uitgave zijn');

    tx.linkedExpenseId = expenseId;
    await this.repo.save(tx);
    return this.findOneShaped(id);
  }

  async unlink(id: number) {
    const tx = await this.repo.findOneBy({ id });
    if (!tx) throw new NotFoundException('Transactie niet gevonden');
    tx.linkedExpenseId = null;
    await this.repo.save(tx);
    return this.findOneShaped(id);
  }
}
