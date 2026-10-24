import { Module } from '@nestjs/common';
import { BudgetsModule } from '../budgets/budgets.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { PeriodsModule } from '../periods/periods.module';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [BudgetsModule, ReservationsModule, TransactionsModule, PeriodsModule],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
