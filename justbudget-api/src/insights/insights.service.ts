import { Injectable } from '@nestjs/common';
import { BudgetsService } from '../budgets/budgets.service';
import { ReservationsService } from '../reservations/reservations.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PeriodsService } from '../periods/periods.service';

// Spend rarely lands on exactly 100% of a budget (rounding, a few cents' difference),
// so "paid" is treated as reaching this percentage rather than an exact match.
const PAID_THRESHOLD = 95;

function todayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class InsightsService {
  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly reservationsService: ReservationsService,
    private readonly transactionsService: TransactionsService,
    private readonly periodsService: PeriodsService,
  ) {}

  async getInsights(periodStart?: string) {
    const statuses = await this.budgetsService.getBudgetStatus(periodStart);
    const insights: Array<{ id: number; type: 'success' | 'warning' | 'danger' | 'info'; message: string }> = [];
    let id = 1;

    for (const s of statuses) {
      if (s.overBudget) {
        insights.push({
          id: id++,
          type: 'danger',
          message: `${s.category} heeft het budget overschreden met € ${Math.abs(s.remaining).toFixed(2).replace('.', ',')}`,
        });
      } else if (s.budget !== 0 && s.warnThreshold != null && s.percentage >= s.warnThreshold) {
        insights.push({
          id: id++,
          type: 'warning',
          message: `${s.category} is op ${Math.round(s.percentage)}% van het budget`,
        });
      }

      if (s.notifyPaid && s.budget !== 0 && !s.overBudget && s.percentage >= PAID_THRESHOLD) {
        insights.push({ id: id++, type: 'success', message: `${s.category} is betaald` });
      }
    }

    return insights;
  }

  async getYearlyTrend(year: number) {
    const periods = await this.periodsService.listPeriodsInYear(year);
    const today = todayStr();

    return Promise.all(
      periods.map(async ({ start, end }) => {
        const asOf = end ?? today;
        const [summary, reservations, yearly, statuses] = await Promise.all([
          this.budgetsService.getBudgetSummary(start),
          this.reservationsService.getSummaryAsOf(asOf),
          this.transactionsService.getYearlyReservations(asOf),
          this.budgetsService.getBudgetStatus(start),
        ]);

        const spendable =
          summary.salary - reservations.totalMonthly - yearly.totalMonthlyReservation - summary.totalSpent;

        return {
          periodStart: start,
          periodEnd: end,
          monthLabel: new Intl.DateTimeFormat('nl-NL', { month: 'short' }).format(new Date(start)),
          spendable: Math.round(spendable * 100) / 100,
          totalSpent: summary.totalSpent,
          totalIncome: summary.salary,
          categories: statuses.map((s) => ({
            categoryId: s.categoryId,
            category: s.category,
            spent: s.spent,
            budget: s.budget,
          })),
        };
      }),
    );
  }
}
