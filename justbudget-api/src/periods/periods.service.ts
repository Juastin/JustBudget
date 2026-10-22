import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PeriodSettings } from '../entities/period-settings.entity';
import { PeriodBoundary } from '../entities/period-boundary.entity';
import { Transaction } from '../entities/transaction.entity';
import { normalizeKey } from '../common/normalize-key';
import { UpdatePeriodSettingsDto } from './dto/update-period-settings.dto';

export interface PeriodRange {
  start: string;
  end: string | null;
}

export interface TriggerCandidate {
  key: string;
  description: string;
  lastDate: string;
  lastAmount: number;
  count: number;
}

export interface PeriodInfo {
  start: string;
  end: string | null;
  transactionCount: number;
}

function fmt(y: number, month0: number, d: number): string {
  return `${y}-${String(month0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayStr(): string {
  const now = new Date();
  return fmt(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return fmt(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function fixedDayPeriodFromStart(startYear: number, startMonth0: number, anchorDay: number): PeriodRange {
  const start = fmt(startYear, startMonth0, anchorDay);
  const endDate = new Date(startYear, startMonth0 + 1, anchorDay - 1);
  const end = fmt(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  return { start, end };
}

function fixedDayPeriodContaining(anchorDay: number, dateStr: string): PeriodRange {
  const [y, m, d] = dateStr.split('-').map(Number);
  const month0 = m - 1;
  if (d >= anchorDay) {
    return fixedDayPeriodFromStart(y, month0, anchorDay);
  }
  const prev = new Date(y, month0 - 1, 1);
  return fixedDayPeriodFromStart(prev.getFullYear(), prev.getMonth(), anchorDay);
}

function fixedDayAdjacent(anchorDay: number, periodStart: string, direction: 'prev' | 'next'): PeriodRange {
  const [y, m] = periodStart.split('-').map(Number);
  const month0 = m - 1;
  const delta = direction === 'next' ? 1 : -1;
  const shifted = new Date(y, month0 + delta, 1);
  return fixedDayPeriodFromStart(shifted.getFullYear(), shifted.getMonth(), anchorDay);
}

@Injectable()
export class PeriodsService {
  constructor(
    @InjectRepository(PeriodSettings) private readonly settingsRepo: Repository<PeriodSettings>,
    @InjectRepository(PeriodBoundary) private readonly boundaryRepo: Repository<PeriodBoundary>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
  ) {}

  async getSettings(): Promise<PeriodSettings> {
    let settings = await this.settingsRepo.find({ take: 1 }).then((rows) => rows[0]);
    if (!settings) {
      settings = await this.settingsRepo.save(
        this.settingsRepo.create({ mode: 'FIXED_DAY', anchorDay: 20, triggerDescription: null }),
      );
    }
    return settings;
  }

  async getSettingsView() {
    const settings = await this.getSettings();
    return {
      mode: settings.mode,
      anchorDay: settings.anchorDay,
      triggerDescription: settings.triggerDescription,
    };
  }

  async updateSettings(dto: UpdatePeriodSettingsDto) {
    if (dto.mode === 'TRANSACTION' && !dto.triggerDescription?.trim()) {
      throw new BadRequestException('Selecteer een transactie om de periode op te resetten');
    }
    const settings = await this.getSettings();
    settings.mode = dto.mode;
    settings.anchorDay = dto.anchorDay;
    if (dto.mode === 'TRANSACTION' && dto.triggerDescription) {
      settings.triggerDescription = normalizeKey(dto.triggerDescription);
    } else {
      settings.triggerDescription = null;
    }
    await this.settingsRepo.save(settings);
    return this.getSettingsView();
  }

  async getTriggerCandidates(): Promise<TriggerCandidate[]> {
    const rows = await this.txRepo.find({
      select: ['description', 'transactionDate', 'amount'],
      order: { transactionDate: 'DESC' },
    });

    const candidates = new Map<string, TriggerCandidate>();
    for (const row of rows) {
      const key = normalizeKey(row.description);
      const existing = candidates.get(key);
      if (existing) {
        existing.count++;
      } else {
        candidates.set(key, {
          key,
          description: row.description,
          lastDate: row.transactionDate,
          lastAmount: Number(row.amount),
          count: 1,
        });
      }
    }

    return Array.from(candidates.values()).sort((a, b) => b.count - a.count || b.lastDate.localeCompare(a.lastDate));
  }

  private async getTriggerDates(triggerKey: string): Promise<string[]> {
    const rows = await this.txRepo.find({ select: ['description', 'transactionDate'] });
    const dates = rows.filter((r) => normalizeKey(r.description) === triggerKey).map((r) => r.transactionDate);
    return Array.from(new Set(dates)).sort();
  }

  // The computed (settings-driven) period starts covering a date range, ignoring any manual boundaries.
  // Used only to seed the boundary table and to extend it forward over time.
  private async computedPeriodStartsInYear(year: number): Promise<string[]> {
    const settings = await this.getSettings();

    if (settings.mode === 'TRANSACTION' && settings.triggerDescription) {
      const triggerDates = await this.getTriggerDates(settings.triggerDescription);
      if (triggerDates.length > 0) {
        return triggerDates.filter((d) => d.startsWith(String(year)));
      }
    }

    const starts: string[] = [];
    for (let month0 = 0; month0 < 12; month0++) {
      starts.push(fixedDayPeriodFromStart(year, month0, settings.anchorDay).start);
    }
    return starts;
  }

  private async computeNextBoundaryAfter(after: string): Promise<string | null> {
    const settings = await this.getSettings();
    if (settings.mode === 'TRANSACTION' && settings.triggerDescription) {
      const triggerDates = await this.getTriggerDates(settings.triggerDescription);
      const future = triggerDates.filter((d) => d > after);
      return future.length > 0 ? future[0] : null;
    }
    return fixedDayAdjacent(settings.anchorDay, after, 'next').start;
  }

  private async ensureSeeded(): Promise<void> {
    const count = await this.boundaryRepo.count();
    if (count > 0) return;

    const firstTx = await this.txRepo.find({
      select: ['transactionDate'],
      order: { transactionDate: 'ASC' },
      take: 1,
    });
    if (firstTx.length === 0) return;

    const settings = await this.getSettings();
    const earliest = firstTx[0].transactionDate;
    const today = todayStr();

    let starts: string[];
    if (settings.mode === 'TRANSACTION' && settings.triggerDescription) {
      const triggerDates = await this.getTriggerDates(settings.triggerDescription);
      starts = [...triggerDates];
      if (starts.length === 0 || starts[0] > earliest) {
        starts.unshift(fixedDayPeriodContaining(settings.anchorDay, earliest).start);
      }
    } else {
      starts = [fixedDayPeriodContaining(settings.anchorDay, earliest).start];
    }

    const maxYear = Math.max(Number(today.split('-')[0]), Number((starts[starts.length - 1] ?? earliest).split('-')[0]));
    const minYear = Number(starts[0].split('-')[0]);
    const seen = new Set(starts);
    for (let y = minYear; y <= maxYear; y++) {
      for (const s of await this.computedPeriodStartsInYear(y)) {
        if (s >= starts[0] && s <= today && !seen.has(s)) {
          seen.add(s);
          starts.push(s);
        }
      }
    }

    const sorted = Array.from(seen).sort();
    await this.boundaryRepo.save(sorted.map((date) => this.boundaryRepo.create({ date })));
  }

  // Extends the stored boundaries forward so "today" always falls inside an up-to-date period.
  private async ensureExtendedThroughToday(): Promise<void> {
    const last = await this.boundaryRepo.find({ order: { date: 'DESC' }, take: 1 }).then((rows) => rows[0]);
    if (!last) return;

    const today = todayStr();
    let current = last.date;
    for (;;) {
      const next = await this.computeNextBoundaryAfter(current);
      if (!next || next > today) break;
      await this.boundaryRepo.save(this.boundaryRepo.create({ date: next }));
      current = next;
    }
  }

  private async extendBoundariesByOne(): Promise<string | null> {
    const last = await this.boundaryRepo.find({ order: { date: 'DESC' }, take: 1 }).then((rows) => rows[0]);
    if (!last) return null;
    const next = await this.computeNextBoundaryAfter(last.date);
    if (!next) return null;
    await this.boundaryRepo.save(this.boundaryRepo.create({ date: next }));
    return next;
  }

  async getAllBoundaries(): Promise<string[]> {
    await this.ensureSeeded();
    await this.ensureExtendedThroughToday();
    const rows = await this.boundaryRepo.find({ order: { date: 'ASC' } });
    return rows.map((r) => r.date);
  }

  private rangeForIndex(boundaries: string[], idx: number): PeriodRange {
    const start = boundaries[idx];
    const end = idx + 1 < boundaries.length ? addDays(boundaries[idx + 1], -1) : null;
    return { start, end };
  }

  private indexForReference(boundaries: string[], reference: string): number {
    let idx = -1;
    for (let i = 0; i < boundaries.length; i++) {
      if (boundaries[i] <= reference) idx = i;
      else break;
    }
    return idx === -1 ? 0 : idx;
  }

  async getPeriod(periodStart?: string): Promise<PeriodRange> {
    const boundaries = await this.getAllBoundaries();
    if (boundaries.length === 0) {
      const settings = await this.getSettings();
      return fixedDayPeriodContaining(settings.anchorDay, periodStart ?? todayStr());
    }
    const reference = periodStart ?? todayStr();
    return this.rangeForIndex(boundaries, this.indexForReference(boundaries, reference));
  }

  async getAdjacentPeriod(periodStart: string, direction: 'prev' | 'next'): Promise<PeriodRange> {
    const boundaries = await this.getAllBoundaries();
    if (boundaries.length === 0) {
      const settings = await this.getSettings();
      return fixedDayAdjacent(settings.anchorDay, periodStart, direction);
    }

    let idx = boundaries.indexOf(periodStart);
    if (idx === -1) idx = this.indexForReference(boundaries, periodStart);

    const newIdx = direction === 'next' ? idx + 1 : idx - 1;
    if (newIdx < 0) {
      return this.rangeForIndex(boundaries, 0);
    }
    if (newIdx >= boundaries.length) {
      const extended = await this.extendBoundariesByOne();
      if (!extended) return this.rangeForIndex(boundaries, idx);
      const all = await this.boundaryRepo.find({ order: { date: 'ASC' } }).then((rows) => rows.map((r) => r.date));
      return this.rangeForIndex(all, all.length - 1);
    }
    return this.rangeForIndex(boundaries, newIdx);
  }

  async listPeriodsInYear(year: number): Promise<PeriodRange[]> {
    const boundaries = await this.getAllBoundaries();
    const ranges: PeriodRange[] = [];
    for (let i = 0; i < boundaries.length; i++) {
      if (boundaries[i].startsWith(String(year))) {
        ranges.push(this.rangeForIndex(boundaries, i));
      }
    }
    return ranges;
  }

  async listPeriodsWithTransactions(): Promise<PeriodInfo[]> {
    const boundaries = await this.getAllBoundaries();
    if (boundaries.length === 0) return [];

    const allTx = await this.txRepo.find({ select: ['transactionDate'] });
    const dates = allTx.map((t) => t.transactionDate).sort();

    const result: PeriodInfo[] = [];
    for (let i = 0; i < boundaries.length; i++) {
      const range = this.rangeForIndex(boundaries, i);
      const count = dates.filter((d) => d >= range.start && (range.end === null || d <= range.end)).length;
      if (count === 0) continue;
      result.push({ start: range.start, end: range.end, transactionCount: count });
    }

    return result.sort((a, b) => b.start.localeCompare(a.start));
  }

  // Replaces the entire set of period boundaries atomically. `dates` are the start dates of
  // every period; consecutive dates define each period's range, and the last one is open-ended.
  // This is how periods are split (add a date), merged (remove a date) or moved (change a date).
  async saveBoundaries(dates: string[]): Promise<PeriodInfo[]> {
    const cleaned = Array.from(new Set(dates)).sort();

    const allTx = await this.txRepo.find({ select: ['transactionDate'] });
    if (allTx.length > 0) {
      const earliest = allTx.map((t) => t.transactionDate).sort()[0];
      if (cleaned[0] > earliest) {
        throw new BadRequestException(`De eerste periode moet beginnen op of voor ${earliest}`);
      }
    }

    await this.boundaryRepo.manager.transaction(async (manager) => {
      await manager.clear(PeriodBoundary);
      await manager.save(PeriodBoundary, cleaned.map((date) => ({ date })));
    });

    return this.listPeriodsWithTransactions();
  }
}
