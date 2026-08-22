import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface ParsedTransaction {
  transactionDate: string; // YYYY-MM-DD
  code: string;
  description: string;
  amount: number; // negative = debit, positive = credit
  hash: string;
}

interface TextItem {
  x: number;
  y: number; // global y across all pages (page-offset applied)
  str: string;
}

// Rabobank PDF column layout (observed from real statements):
//   x ≈  37        → transaction date  (DD-MM)
//   x ≈  69        → type code         (bc, we, id, …)
//   x ≈  89–200    → counter-account   (IBAN, optional)
//   x ≈ 206–430    → description / merchant name
//   x ≈ 444–454    → debit amount      ("Bedrag af")
//   x ≈ 509–547    → credit amount     ("Bedrag bij")
//
// Amounts left of this threshold are debits (negative), right are credits (positive).
const DEBIT_X_THRESHOLD = 480;

// Amount tokens: digits with optional period thousands-separator and comma decimal  e.g. "46,52", "1.234,56"
const AMOUNT_TOKEN_RE = /^\d[\d.]*,\d{2}$/;

// Transaction date tokens: exactly "DD-MM"
const DATE_TOKEN_RE = /^\d{2}-\d{2}$/;

// Year anchor: first "DD-MM-YYYY" date found anywhere in the document
const YEAR_RE = /\b\d{2}-\d{2}-(\d{4})\b/;

// Maximum y-coordinate on a single Rabobank PDF page (observed: ~810)
const PAGE_Y_SPAN = 1000;

@Injectable()
export class PdfParserService {
  async parse(buffer: Buffer): Promise<ParsedTransaction[]> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs' as string) as any;
    const getDocument = pdfjsLib.getDocument ?? pdfjsLib.default?.getDocument;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf = await (getDocument({ data: new Uint8Array(buffer) }) as any).promise as any;
    const numPages: number = pdf.numPages;

    const items: TextItem[] = [];

    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();

      // Apply a per-page y-offset so coordinates are globally unique.
      // Page 1 gets the highest offset (= top of document).
      const pageOffset = (numPages - p) * PAGE_Y_SPAN;

      for (const raw of content.items as Array<{ str: string; transform: number[] }>) {
        const str = raw.str.trim();
        if (!str) continue;
        items.push({
          x: Math.round(raw.transform[4]),
          y: Math.round(raw.transform[5]) + pageOffset,
          str,
        });
      }
    }

    return this.extractTransactions(items);
  }

  private extractTransactions(items: TextItem[]): ParsedTransaction[] {
    // Determine document year from any "DD-MM-YYYY" date in the text
    const fullText = items.map((i) => i.str).join(' ');
    const yearMatch = YEAR_RE.exec(fullText);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    // Find all transaction-start rows: items at x ∈ [30, 55] matching "DD-MM"
    const dateItems = items
      .filter((i) => i.x >= 30 && i.x <= 55 && DATE_TOKEN_RE.test(i.str))
      .sort((a, b) => b.y - a.y); // descending = document order top → bottom

    const transactions: ParsedTransaction[] = [];

    for (let di = 0; di < dateItems.length; di++) {
      const dateItem = dateItems[di];
      const nextDateY = di + 1 < dateItems.length ? dateItems[di + 1].y : -Infinity;

      // Collect all items belonging to this transaction block.
      // The block extends from the date row down to just above the next date row.
      const block = items.filter(
        (i) => i.y <= dateItem.y + 3 && i.y > nextDateY + 3,
      );

      // --- Amount ---
      // Look for an amount token at x ≥ 430 on the date row (±3 px tolerance).
      // Fall back to nearest amount within 20 px below if none on the same row.
      const amountItem =
        block.find(
          (i) =>
            Math.abs(i.y - dateItem.y) <= 3 &&
            i.x >= 430 &&
            AMOUNT_TOKEN_RE.test(i.str),
        ) ??
        block.find(
          (i) =>
            i.y >= dateItem.y - 20 &&
            i.x >= 430 &&
            AMOUNT_TOKEN_RE.test(i.str),
        );

      if (!amountItem) continue; // not a real transaction row

      const rawAmount = parseFloat(
        amountItem.str.replace(/\./g, '').replace(',', '.'),
      );
      const sign = amountItem.x < DEBIT_X_THRESHOLD ? -1 : 1;
      const amount = rawAmount * sign;

      // --- Description ---
      // Items at x ∈ [200, 430] within 15 px below the date row.
      // The merchant name is on the first y-line of those items;
      // subsequent lines contain terminal/location details we discard.
      const descCandidates = block
        .filter(
          (i) =>
            i.x >= 200 &&
            i.x <= 430 &&
            i.y >= dateItem.y - 15 &&
            i.y <= dateItem.y + 3,
        )
        .sort((a, b) => b.y - a.y || a.x - b.x); // top row first, then left→right

      let description = '';
      if (descCandidates.length > 0) {
        // Take only items on the topmost y-line (within 3 px of each other)
        const topY = descCandidates[0].y;
        description = descCandidates
          .filter((i) => Math.abs(i.y - topY) <= 3)
          .map((i) => i.str)
          .join(' ')
          .trim();
      }

      if (!description) continue; // skip header/footer rows that matched the date pattern

      // --- Type code ---
      const typeItem = block.find(
        (i) => Math.abs(i.y - dateItem.y) <= 3 && i.x >= 60 && i.x <= 85,
      );
      const code = typeItem?.str.toLowerCase() ?? '';

      // --- Transaction date ---
      const [day, month] = dateItem.str.split('-').map(Number);
      const transactionDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      // --- Hash (matches the Python backend's algorithm) ---
      const hashInput = `${transactionDate}|${description.trim().toLowerCase()}|${amount.toFixed(2)}`;
      const hash = crypto.createHash('sha256').update(hashInput).digest('hex');

      transactions.push({ transactionDate, code, description, amount, hash });
    }

    return transactions;
  }
}
