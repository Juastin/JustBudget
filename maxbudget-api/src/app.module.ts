import { join } from 'path';
import { existsSync } from 'fs';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { Category } from './entities/category.entity';
import { Budget } from './entities/budget.entity';
import { Transaction } from './entities/transaction.entity';
import { CategoryRule } from './entities/category-rule.entity';
import { Reservation } from './entities/reservation.entity';
import { CategoriesModule } from './categories/categories.module';
import { BudgetsModule } from './budgets/budgets.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoryRulesModule } from './category-rules/category-rules.module';
import { ReservationsModule } from './reservations/reservations.module';
import { InsightsModule } from './insights/insights.module';
import { ImportModule } from './import/import.module';
import { SeederService } from './seeder.service';

const staticPath = join(__dirname, '..', 'public');

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      location: process.env.DB_PATH || 'budget-nest.db',
      autoSave: true,
      entities: [Category, Budget, Transaction, CategoryRule, Reservation],
      synchronize: true,
    }),
    ...(existsSync(staticPath) ? [ServeStaticModule.forRoot({
      rootPath: staticPath,
      exclude: ['/api/(.*)'],
    })] : []),
    TypeOrmModule.forFeature([Category, CategoryRule]),
    CategoriesModule,
    BudgetsModule,
    TransactionsModule,
    CategoryRulesModule,
    ReservationsModule,
    InsightsModule,
    ImportModule,
  ],
  providers: [SeederService],
})
export class AppModule {}
