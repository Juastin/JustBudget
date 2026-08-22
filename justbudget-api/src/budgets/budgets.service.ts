import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { Transaction } from '../entities/transaction.entity';
import { Category } from '../entities/category.entity';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget) private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
  ) {}

  // Pay period: 20th of the start month to 19th of the next month.
  private payPeriod(year?: number, month?: number): { start: string; end: string } {
    let startYear: number;
    let startMonth: number; // 0-indexed

    if (year !== undefined && month !== undefined) {
      startYear = year;
      startMonth = month - 1;
    } else {
      const now = new Date();
      if (now.getDate() >= 20) {
        startYear = now.getFullYear();
        startMonth = now.getMonth();
      } else {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startYear = prev.getFullYear();
        startMonth = prev.getMonth();
      }
    }

    const endDate = new Date(startYear, startMonth + 1, 19);
    const fmt = (y: number, m: number, d: number) =>
      `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    return {
      start: fmt(startYear, startMonth, 20),
      end: fmt(endDate.getFullYear(), endDate.getMonth(), 19),
    };
  }

  async findAll() {
    await this.ensureBudgets();
    const budgets = await this.budgetRepo.find({
      relations: ['category'],
      order: { id: 'ASC' },
    });
    return budgets.map((b) => ({
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.category?.name ?? '',
      amount: Number(b.amount),
    }));
  }

  async getBudgetStatus(year?: number, month?: number) {
    await this.ensureBudgets();
    const { start, end } = this.payPeriod(year, month);
    const budgets = await this.budgetRepo.find({ relations: ['category'], order: { id: 'ASC' } });

    const [startYear, startMonth] = start.split('-').map(Number);
    const prev = this.payPeriod(
      startMonth === 1 ? startYear - 1 : startYear,
      startMonth === 1 ? 12 : startMonth - 1,
    );

    const prevRows = await this.txRepo
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.transactionDate >= :prevStart', { prevStart: prev.start })
      .andWhere('t.transactionDate <= :prevEnd', { prevEnd: prev.end })
      .groupBy('t.categoryId')
      .getRawMany<{ categoryId: number | string; total: string | null }>();
    const prevSpentMap = new Map(prevRows.map((r) => [Number(r.categoryId), -Number(r.total ?? 0)]));

    const results = await Promise.all(
      budgets.map(async (b) => {
        const rows = await this.txRepo
          .createQueryBuilder('t')
          .select('SUM(t.amount)', 'total')
          .where('t.categoryId = :cid', { cid: b.categoryId })
          .andWhere('t.transactionDate >= :start', { start })
          .andWhere('t.transactionDate <= :end', { end })
          .getRawOne<{ total: string | null }>();

        const spent = -Number(rows?.total ?? 0);
        const budget = Number(b.amount);
        const remaining = budget - spent;
        const percentage = budget > 0 ? Math.round((spent / budget) * 1000) / 10 : 0;
        const previousSpent = prevSpentMap.get(b.categoryId) ?? 0;

        return {
          budgetId: b.id,
          categoryId: b.categoryId,
          category: b.category?.name ?? '',
          color: b.category?.color ?? '#6b7280',
          budget,
          spent,
          remaining,
          overBudget: budget > 0 && spent > budget,
          percentage,
          previousSpent: Math.round(previousSpent * 100) / 100,
          delta: Math.round((spent - previousSpent) * 100) / 100,
        };
      }),
    );

    return results;
  }

  async getBudgetSummary(year?: number, month?: number) {
    const { start, end } = this.payPeriod(year, month);

    const [startYear, startMonth] = start.split('-').map(Number);
    const prev = this.payPeriod(
      startMonth === 1 ? startYear - 1 : startYear,
      startMonth === 1 ? 12 : startMonth - 1,
    );

    const [salaryCategory, overboekingCategory] = await Promise.all([
      this.categoryRepo.findOneBy({ name: 'Salaris' }),
      this.categoryRepo.findOneBy({ name: 'Overboekingen' }),
    ]);

    let salary = 0;
    if (salaryCategory) {
      const row = await this.txRepo
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where('t.categoryId = :cid', { cid: salaryCategory.id })
        .andWhere('t.transactionDate >= :start', { start })
        .andWhere('t.transactionDate <= :end', { end })
        .getRawOne<{ total: string | null }>();
      salary = Number(row?.total ?? 0);
    }

    const spentQb = this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.transactionDate >= :start', { start })
      .andWhere('t.transactionDate <= :end', { end })
      .andWhere('t.amount < 0');
    if (overboekingCategory) {
      spentQb.andWhere('(t.categoryId != :ocid OR t.categoryId IS NULL)', { ocid: overboekingCategory.id });
    }
    const spentRow = await spentQb.getRawOne<{ total: string | null }>();
    const totalSpent = -Number(spentRow?.total ?? 0);

    const budgets = await this.budgetRepo.find();
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
    const leftover = salary - totalSpent;

    const prevSpentQb = this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.transactionDate >= :prevStart', { prevStart: prev.start })
      .andWhere('t.transactionDate <= :prevEnd', { prevEnd: prev.end })
      .andWhere('t.amount < 0');
    if (overboekingCategory) {
      prevSpentQb.andWhere('(t.categoryId != :ocid OR t.categoryId IS NULL)', { ocid: overboekingCategory.id });
    }
    const prevSpentRow = await prevSpentQb.getRawOne<{ total: string | null }>();
    const previousTotalSpent = -Number(prevSpentRow?.total ?? 0);

    const latestRow = await this.txRepo
      .createQueryBuilder('t')
      .select('MAX(t.transactionDate)', 'latest')
      .getRawOne<{ latest: string | null }>();

    return {
      salary: Math.round(salary * 100) / 100,
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      leftover: Math.round(leftover * 100) / 100,
      periodStart: start,
      periodEnd: end,
      latestTransactionDate: latestRow?.latest ?? null,
      previousTotalSpent: Math.round(previousTotalSpent * 100) / 100,
    };
  }

  async update(id: number, dto: UpdateBudgetDto) {
    const budget = await this.budgetRepo.findOne({ where: { id }, relations: ['category'] });
    if (!budget) throw new NotFoundException('Budget niet gevonden');
    budget.amount = dto.amount;
    await this.budgetRepo.save(budget);

    // Return updated status for the current period
    const { start, end } = this.payPeriod();
    const rows = await this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.categoryId = :cid', { cid: budget.categoryId })
      .andWhere('t.transactionDate >= :start', { start })
      .andWhere('t.transactionDate <= :end', { end })
      .getRawOne<{ total: string | null }>();

    const spent = -Number(rows?.total ?? 0);
    const amount = Number(dto.amount);
    const remaining = amount - spent;
    return {
      budgetId: budget.id,
      categoryId: budget.categoryId,
      category: budget.category?.name ?? '',
      color: budget.category?.color ?? '#6b7280',
      budget: amount,
      spent,
      remaining,
      overBudget: amount > 0 && spent > amount,
      percentage: amount > 0 ? Math.round((spent / amount) * 1000) / 10 : 0,
    };
  }

  async ensureBudgets(): Promise<void> {
    const categories = await this.categoryRepo.find();
    for (const cat of categories) {
      const exists = await this.budgetRepo.findOneBy({ categoryId: cat.id });
      if (!exists) {
        await this.budgetRepo.save(this.budgetRepo.create({ categoryId: cat.id, amount: 0 }));
      }
    }
  }
}
