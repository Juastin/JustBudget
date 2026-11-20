import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlannedPayment } from '../entities/planned-payment.entity';
import { Transaction } from '../entities/transaction.entity';
import { PeriodsModule } from '../periods/periods.module';
import { PlannedPaymentsController } from './planned-payments.controller';
import { PlannedPaymentsService } from './planned-payments.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlannedPayment, Transaction]), PeriodsModule],
  controllers: [PlannedPaymentsController],
  providers: [PlannedPaymentsService],
  exports: [PlannedPaymentsService],
})
export class PlannedPaymentsModule {}
