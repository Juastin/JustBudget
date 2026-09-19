import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PeriodSettings } from '../entities/period-settings.entity';
import { PeriodOverride } from '../entities/period-override.entity';
import { Transaction } from '../entities/transaction.entity';
import { PeriodsController } from './periods.controller';
import { PeriodsService } from './periods.service';

@Module({
  imports: [TypeOrmModule.forFeature([PeriodSettings, PeriodOverride, Transaction])],
  controllers: [PeriodsController],
  providers: [PeriodsService],
  exports: [PeriodsService],
})
export class PeriodsModule {}
