import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Transaction } from '../entities/transaction.entity';
import { CategoryRulesModule } from '../category-rules/category-rules.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { PdfParserService } from './pdf-parser.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    MulterModule.register({ limits: { fileSize: 20 * 1024 * 1024 } }),
    CategoryRulesModule,
    TransactionsModule,
  ],
  controllers: [ImportController],
  providers: [ImportService, PdfParserService],
})
export class ImportModule {}
