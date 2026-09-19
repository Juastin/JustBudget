import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Budget } from '../entities/budget.entity';
import { Transaction } from '../entities/transaction.entity';
import { Category } from '../entities/category.entity';
import { PeriodsModule } from '../periods/periods.module';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';

@Module({
  imports: [TypeOrmModule.forFeature([Budget, Transaction, Category]), PeriodsModule],
  controllers: [BudgetsController],
  providers: [BudgetsService],
  exports: [BudgetsService],
})
export class BudgetsModule {}
