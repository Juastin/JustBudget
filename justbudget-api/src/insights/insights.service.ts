import { Injectable } from '@nestjs/common';
import { BudgetsService } from '../budgets/budgets.service';

@Injectable()
export class InsightsService {
  constructor(private readonly budgetsService: BudgetsService) {}

  async getInsights(year?: number, month?: number) {
    const statuses = await this.budgetsService.getBudgetStatus(year, month);
    const summary = await this.budgetsService.getBudgetSummary(year, month);
    const insights: Array<{ id: number; type: 'success' | 'warning' | 'danger' | 'info'; message: string }> = [];
    let id = 1;

    for (const s of statuses) {
      if (s.overBudget) {
        insights.push({
          id: id++,
          type: 'danger',
          message: `${s.category} heeft het budget overschreden met € ${Math.abs(s.remaining).toFixed(2).replace('.', ',')}`,
        });
      } else if (s.budget > 0 && s.warnThreshold != null && s.percentage >= s.warnThreshold) {
        insights.push({
          id: id++,
          type: 'warning',
          message: `${s.category} is op ${Math.round(s.percentage)}% van het budget`,
        });
      }

      if (s.notifyPaid && s.budget > 0 && !s.overBudget && s.percentage >= 100) {
        insights.push({ id: id++, type: 'success', message: `${s.category} is betaald` });
      }
    }

    if (summary.leftover > 0) {
      insights.push({
        id: id++,
        type: 'info',
        message: `Je hebt nog € ${summary.leftover.toFixed(2).replace('.', ',')} over in deze periode`,
      });
    }

    return insights;
  }
}
