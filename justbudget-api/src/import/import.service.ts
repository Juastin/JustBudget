import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { CategoryRulesService } from '../category-rules/category-rules.service';
import { TransactionsService } from '../transactions/transactions.service';
import { PdfParserService } from './pdf-parser.service';
import { IngCsvParserService } from './ing-csv-parser.service';

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    private readonly pdfParser: PdfParserService,
    private readonly ingCsvParser: IngCsvParserService,
    private readonly rulesService: CategoryRulesService,
    private readonly transactionsService: TransactionsService,
  ) {}

  private async parsedTransactions(buffer: Buffer, filename: string) {
    return filename.toLowerCase().endsWith('.csv')
      ? this.ingCsvParser.parse(buffer)
      : await this.pdfParser.parse(buffer);
  }

  async preview(buffer: Buffer, filename: string) {
    const parsed = await this.parsedTransactions(buffer, filename);
    const results = [];
    let newCount = 0;
    let existingCount = 0;

    for (const t of parsed) {
      const exists = await this.txRepo.findOneBy({ hash: t.hash });
      const isNew = !exists;
      const category = await this.rulesService.findMatchingCategory(t.description);

      if (isNew) newCount++; else existingCount++;

      results.push({
        ...t,
        isNew,
        categoryId: category?.id ?? null,
        category: category?.name ?? null,
      });
    }

    return {
      status: 'success',
      count: results.length,
      newTransactions: newCount,
      existingTransactions: existingCount,
      transactions: results,
    };
  }

  async confirm(buffer: Buffer, filename: string) {
    const parsed = await this.parsedTransactions(buffer, filename);
    let imported = 0;
    let skipped = 0;

    for (const t of parsed) {
      const exists = await this.txRepo.findOneBy({ hash: t.hash });
      if (exists) { skipped++; continue; }

      const category = await this.rulesService.findMatchingCategory(t.description);
      const recurringTemplate = await this.transactionsService.findRecurringByDescription(t.description);
      const tx = this.txRepo.create({
        description: t.description,
        amount: t.amount,
        transactionDate: t.transactionDate,
        hash: t.hash,
        categoryId: category?.id ?? undefined,
        category: category ?? undefined,
        isRecurring: recurringTemplate?.isRecurring ?? false,
        recurringPeriod: recurringTemplate?.recurringPeriod ?? 'monthly',
      });
      await this.txRepo.save(tx);
      imported++;
    }

    return { status: 'success', parsed: parsed.length, imported, skipped };
  }
}
