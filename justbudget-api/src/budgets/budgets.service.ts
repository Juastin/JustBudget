import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { Transaction } from '../entities/transaction.entity';
import { Category } from '../entities/category.entity';
import { PeriodsService } from '../periods/periods.service';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget) private readonly budgetRepo: Repository<Budget>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    private readonly periodsService: PeriodsService,
  ) {}

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

  async getBudgetStatus(periodStart?: string) {
    await this.ensureBudgets();
    const { start, end } = await this.periodsService.getPeriod(periodStart);
    const budgets = await this.budgetRepo.find({ relations: ['category'], order: { id: 'ASC' } });

    const prev = await this.periodsService.getAdjacentPeriod(start, 'prev');

    const prevRowsQb = this.txRepo
      .createQueryBuilder('t')
      .select('t.categoryId', 'categoryId')
      .addSelect('SUM(t.amount)', 'total')
      .where('t.transactionDate >= :prevStart', { prevStart: prev.start });
    if (prev.end) prevRowsQb.andWhere('t.transactionDate <= :prevEnd', { prevEnd: prev.end });
    const prevRows = await prevRowsQb
      .groupBy('t.categoryId')
      .getRawMany<{ categoryId: number | string; total: string | null }>();
    const prevSpentMap = new Map(prevRows.map((r) => [Number(r.categoryId), -Number(r.total ?? 0)]));

    const results = await Promise.all(
      budgets.map(async (b) => {
        const rowsQb = this.txRepo
          .createQueryBuilder('t')
          .select('SUM(t.amount)', 'total')
          .where('t.categoryId = :cid', { cid: b.categoryId })
          .andWhere('t.linkedExpenseId IS NULL')
          .andWhere('t.transactionDate >= :start', { start });
        if (end) rowsQb.andWhere('t.transactionDate <= :end', { end });
        const rows = await rowsQb.getRawOne<{ total: string | null }>();

        // Reimbursements (e.g. Tikkies) are attributed to the category/period of the
        // expense they're linked to, regardless of their own category or date.
        const reimbQb = this.txRepo
          .createQueryBuilder('t')
          .innerJoin('t.linkedExpense', 'le')
          .select('SUM(t.amount)', 'total')
          .where('le.categoryId = :cid', { cid: b.categoryId })
          .andWhere('le.transactionDate >= :start', { start });
        if (end) reimbQb.andWhere('le.transactionDate <= :end', { end });
        const reimbRow = await reimbQb.getRawOne<{ total: string | null }>();

        const spent = -(Number(rows?.total ?? 0) + Number(reimbRow?.total ?? 0));
        const budget = Number(b.amount);
        const remaining = budget - spent;
        const percentage = budget !== 0 ? Math.round((spent / budget) * 1000) / 10 : 0;
        const previousSpent = prevSpentMap.get(b.categoryId) ?? 0;

        return {
          budgetId: b.id,
          categoryId: b.categoryId,
          category: b.category?.name ?? '',
          color: b.category?.color ?? '#6b7280',
          budget,
          spent,
          remaining,
          overBudget: budget !== 0 && spent > budget,
          percentage,
          previousSpent: Math.round(previousSpent * 100) / 100,
          delta: Math.round((spent - previousSpent) * 100) / 100,
          notifyPaid: b.notifyPaid,
          warnThreshold: b.warnThreshold,
        };
      }),
    );

    return results;
  }

  async getBudgetSummary(periodStart?: string) {
    const { start, end } = await this.periodsService.getPeriod(periodStart);
    const prev = await this.periodsService.getAdjacentPeriod(start, 'prev');

    const [salaryCategory, overboekingCategory] = await Promise.all([
      this.categoryRepo.findOneBy({ name: 'Salaris' }),
      this.categoryRepo.findOneBy({ name: 'Overboekingen' }),
    ]);

    let salary = 0;
    if (salaryCategory) {
      const rowQb = this.txRepo
        .createQueryBuilder('t')
        .select('SUM(t.amount)', 'total')
        .where('t.categoryId = :cid', { cid: salaryCategory.id })
        .andWhere('t.transactionDate >= :start', { start });
      if (end) rowQb.andWhere('t.transactionDate <= :end', { end });
      const row = await rowQb.getRawOne<{ total: string | null }>();
      salary = Number(row?.total ?? 0);
    }

    const spentQb = this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.transactionDate >= :start', { start })
      .andWhere('t.amount < 0');
    if (end) spentQb.andWhere('t.transactionDate <= :end', { end });
    if (overboekingCategory) {
      spentQb.andWhere('(t.categoryId != :ocid OR t.categoryId IS NULL)', { ocid: overboekingCategory.id });
    }
    const spentRow = await spentQb.getRawOne<{ total: string | null }>();

    const reimbQb = this.txRepo
      .createQueryBuilder('t')
      .innerJoin('t.linkedExpense', 'le')
      .select('SUM(t.amount)', 'total')
      .where('le.transactionDate >= :start', { start })
      .andWhere('le.amount < 0');
    if (end) reimbQb.andWhere('le.transactionDate <= :end', { end });
    if (overboekingCategory) {
      reimbQb.andWhere('(le.categoryId != :ocid OR le.categoryId IS NULL)', { ocid: overboekingCategory.id });
    }
    const reimbRow = await reimbQb.getRawOne<{ total: string | null }>();

    const totalSpent = -Number(spentRow?.total ?? 0) - Number(reimbRow?.total ?? 0);

    const budgets = await this.budgetRepo.find();
    const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);
    const leftover = salary - totalSpent;

    const prevSpentQb = this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.transactionDate >= :prevStart', { prevStart: prev.start })
      .andWhere('t.amount < 0');
    if (prev.end) prevSpentQb.andWhere('t.transactionDate <= :prevEnd', { prevEnd: prev.end });
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

  async getYearlyAverages(year?: number) {
    await this.ensureBudgets();
    const targetYear = year ?? new Date().getFullYear();
    const budgets = await this.budgetRepo.find({ relations: ['category'], order: { id: 'ASC' } });

    const monthlySpent = new Map<number, number[]>();
    budgets.forEach((b) => monthlySpent.set(b.categoryId, []));

    const periods = await this.periodsService.listPeriodsInYear(targetYear);
    for (const { start, end } of periods) {
      const rowsQb = this.txRepo
        .createQueryBuilder('t')
        .select('t.categoryId', 'categoryId')
        .addSelect('SUM(t.amount)', 'total')
        .where('t.transactionDate >= :start', { start });
      if (end) rowsQb.andWhere('t.transactionDate <= :end', { end });
      const rows = await rowsQb
        .groupBy('t.categoryId')
        .getRawMany<{ categoryId: number | string; total: string | null }>();

      for (const row of rows) {
        const categoryId = Number(row.categoryId);
        const spent = -Number(row.total ?? 0);
        // Only count periods with actual activity, so categories that didn't exist yet
        // (or had no transactions) don't drag the average down. Non-zero covers both
        // expense categories (positive spent) and refund/income-style categories with
        // a negative budget (negative spent).
        if (spent !== 0 && monthlySpent.has(categoryId)) {
          monthlySpent.get(categoryId)!.push(spent);
        }
      }
    }

    return budgets.map((b) => {
      const amounts = monthlySpent.get(b.categoryId) ?? [];
      const average = amounts.length > 0 ? amounts.reduce((s, v) => s + v, 0) / amounts.length : null;
      return {
        categoryId: b.categoryId,
        category: b.category?.name ?? '',
        average: average !== null ? Math.round(average * 100) / 100 : null,
        monthsCounted: amounts.length,
      };
    });
  }

  async update(id: number, dto: UpdateBudgetDto) {
    const budget = await this.budgetRepo.findOne({ where: { id }, relations: ['category'] });
    if (!budget) throw new NotFoundException('Budget niet gevonden');
    budget.amount = dto.amount;
    if (dto.notifyPaid !== undefined) budget.notifyPaid = dto.notifyPaid;
    if (dto.warnThreshold !== undefined) budget.warnThreshold = dto.warnThreshold;
    await this.budgetRepo.save(budget);

    // Return updated status for the current period
    const { start, end } = await this.periodsService.getPeriod();
    const rowsQb = this.txRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .where('t.categoryId = :cid', { cid: budget.categoryId })
      .andWhere('t.transactionDate >= :start', { start });
    if (end) rowsQb.andWhere('t.transactionDate <= :end', { end });
    const rows = await rowsQb.getRawOne<{ total: string | null }>();

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
      overBudget: amount !== 0 && spent > amount,
      percentage: amount !== 0 ? Math.round((spent / amount) * 1000) / 10 : 0,
      notifyPaid: budget.notifyPaid,
      warnThreshold: budget.warnThreshold,
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
