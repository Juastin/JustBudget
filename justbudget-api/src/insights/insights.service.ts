import { Injectable } from '@nestjs/common';
import { BudgetsService } from '../budgets/budgets.service';

// Spend rarely lands on exactly 100% of a budget (rounding, a few cents' difference),
// so "paid" is treated as reaching this percentage rather than an exact match.
const PAID_THRESHOLD = 95;

@Injectable()
export class InsightsService {
  constructor(private readonly budgetsService: BudgetsService) {}

  async getInsights(year?: number, month?: number) {
    const statuses = await this.budgetsService.getBudgetStatus(year, month);
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
}
