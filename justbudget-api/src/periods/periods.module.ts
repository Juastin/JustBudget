import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodSettings } from '../entities/period-settings.entity';
import { PeriodBoundary } from '../entities/period-boundary.entity';
import { Transaction } from '../entities/transaction.entity';
import { PeriodsController } from './periods.controller';
import { PeriodsService } from './periods.service';

@Module({
  imports: [TypeOrmModule.forFeature([PeriodSettings, PeriodBoundary, Transaction])],
  controllers: [PeriodsController],
  providers: [PeriodsService],
  exports: [PeriodsService],
})
export class PeriodsModule {}
