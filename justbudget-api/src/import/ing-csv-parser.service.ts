import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import type { ParsedTransaction } from './pdf-parser.service';

@Injectable()
export class IngCsvParserService {
  parse(buffer: Buffer): ParsedTransaction[] {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const transactions: ParsedTransaction[] = [];

    for (const line of lines.slice(1)) {
      const cols = this.parseLine(line, delimiter);
      if (cols.length < 7) continue;

      const rawDate = cols[0]; // YYYYMMDD
      if (!/^\d{8}$/.test(rawDate)) continue;

      const transactionDate = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const description = cols[1].trim();
      const code = cols[4].trim().toLowerCase();
      const afBij = cols[5].trim().toLowerCase(); // 'af' | 'bij'
      const rawAmount = cols[6].trim();

      // Dutch format: dots = thousands sep, comma = decimal  →  "1.234,56" or "3,55"
      const amount = parseFloat(rawAmount.replace(/\./g, '').replace(',', '.'));
      if (isNaN(amount) || !description) continue;

      const signedAmount = afBij === 'af' ? -amount : amount;
      const hashInput = `${transactionDate}|${description.trim().toLowerCase()}|${signedAmount.toFixed(2)}`;
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

      transactions.push({ transactionDate, code, description, amount: signedAmount, hash });
    }

    return transactions;
  }

  private parseLine(line: string, delimiter: string): string[] {
    const cols: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        cols.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current);
    return cols;
  }
}
