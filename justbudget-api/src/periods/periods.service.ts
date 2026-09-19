import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PeriodSettings } from '../entities/period-settings.entity';
import { PeriodOverride } from '../entities/period-override.entity';
import { Transaction } from '../entities/transaction.entity';
import { normalizeKey } from '../common/normalize-key';
import { UpdatePeriodSettingsDto } from './dto/update-period-settings.dto';
import { UpdatePeriodOverrideDto } from './dto/update-period-override.dto';

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
  originalStart: string;
  start: string;
  end: string | null;
  transactionCount: number;
  hasAdjustment: boolean;
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
    @InjectRepository(PeriodOverride) private readonly overrideRepo: Repository<PeriodOverride>,
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

  private periodRangeForTriggerIndex(triggerDates: string[], idx: number): PeriodRange {
    const start = triggerDates[idx];
    if (idx + 1 < triggerDates.length) {
      return { start, end: addDays(triggerDates[idx + 1], -1) };
    }
    return { start, end: null };
  }

  private transactionPeriodContaining(triggerDates: string[], anchorDay: number, reference: string): PeriodRange {
    let idx = -1;
    for (let i = 0; i < triggerDates.length; i++) {
      if (triggerDates[i] <= reference) idx = i;
      else break;
    }
    if (idx === -1) {
      const fallback = fixedDayPeriodContaining(anchorDay, reference);
      if (fallback.end && fallback.end >= triggerDates[0]) {
        return { start: fallback.start, end: addDays(triggerDates[0], -1) };
      }
      return fallback;
    }
    return this.periodRangeForTriggerIndex(triggerDates, idx);
  }

  // Returns the raw computed period for a given originalStart, without applying adjustments.
  private async getComputedPeriod(originalStart: string): Promise<PeriodRange> {
    const settings = await this.getSettings();
    if (settings.mode === 'TRANSACTION' && settings.triggerDescription) {
      const triggerDates = await this.getTriggerDates(settings.triggerDescription);
      const idx = triggerDates.indexOf(originalStart);
      if (idx !== -1) return this.periodRangeForTriggerIndex(triggerDates, idx);
    }
    return fixedDayPeriodContaining(settings.anchorDay, originalStart);
  }

  // Returns the originalStart of the adjacent computed period, without applying adjustments.
  private async getComputedAdjacentOriginalStart(
    originalStart: string,
    direction: 'prev' | 'next',
  ): Promise<string | null> {
    const settings = await this.getSettings();
    if (settings.mode === 'TRANSACTION' && settings.triggerDescription) {
      const triggerDates = await this.getTriggerDates(settings.triggerDescription);
      const idx = triggerDates.indexOf(originalStart);
      if (idx !== -1) {
        const newIdx = direction === 'next' ? idx + 1 : idx - 1;
        if (newIdx >= 0 && newIdx < triggerDates.length) return triggerDates[newIdx];
        return null;
      }
    }
    return fixedDayAdjacent(settings.anchorDay, originalStart, direction).start;
  }

  private async applyAdjustment(period: PeriodRange): Promise<PeriodRange> {
    const adj = await this.overrideRepo.findOne({ where: { originalStart: period.start } });
    if (!adj) return period;
    return { start: adj.customStart, end: adj.customEnd };
  }

  private async upsertAdjustment(
    originalStart: string,
    customStart: string,
    customEnd: string | null,
    autoCascaded: boolean,
  ): Promise<void> {
    let adj = await this.overrideRepo.findOne({ where: { originalStart } });
    if (!adj) {
      adj = this.overrideRepo.create({ originalStart, customStart, customEnd, autoCascaded });
    } else {
      adj.customStart = customStart;
      adj.customEnd = customEnd;
      adj.autoCascaded = autoCascaded;
    }
    await this.overrideRepo.save(adj);
  }

  async getPeriod(periodStart?: string): Promise<PeriodRange> {
    if (periodStart) {
      const adjByCustom = await this.overrideRepo.findOne({ where: { customStart: periodStart } });
      if (adjByCustom) {
        return { start: adjByCustom.customStart, end: adjByCustom.customEnd };
      }
    }

    const settings = await this.getSettings();
    const reference = periodStart ?? todayStr();

    if (settings.mode === 'TRANSACTION' && settings.triggerDescription) {
      const triggerDates = await this.getTriggerDates(settings.triggerDescription);
      if (triggerDates.length > 0) {
        const period = this.transactionPeriodContaining(triggerDates, settings.anchorDay, reference);
        return this.applyAdjustment(period);
      }
    }
    return this.applyAdjustment(fixedDayPeriodContaining(settings.anchorDay, reference));
  }

  async getAdjacentPeriod(periodStart: string, direction: 'prev' | 'next'): Promise<PeriodRange> {
    const adjByCustom = await this.overrideRepo.findOne({ where: { customStart: periodStart } });
    const navStart = adjByCustom ? adjByCustom.originalStart : periodStart;

    const settings = await this.getSettings();

    if (settings.mode === 'TRANSACTION' && settings.triggerDescription) {
      const triggerDates = await this.getTriggerDates(settings.triggerDescription);
      if (triggerDates.length > 0) {
        const idx = triggerDates.indexOf(navStart);
        if (idx !== -1) {
          const newIdx = direction === 'next' ? idx + 1 : idx - 1;
          if (newIdx >= 0 && newIdx < triggerDates.length) {
            return this.applyAdjustment(this.periodRangeForTriggerIndex(triggerDates, newIdx));
          }
          if (direction === 'next') {
            return this.applyAdjustment(this.periodRangeForTriggerIndex(triggerDates, idx));
          }
          return this.applyAdjustment(fixedDayPeriodContaining(settings.anchorDay, addDays(triggerDates[0], -1)));
        }
      }
    }
    return this.applyAdjustment(fixedDayAdjacent(settings.anchorDay, navStart, direction));
  }

  async listPeriodsInYear(year: number): Promise<PeriodRange[]> {
    const settings = await this.getSettings();

    if (settings.mode === 'TRANSACTION' && settings.triggerDescription) {
      const triggerDates = await this.getTriggerDates(settings.triggerDescription);
      if (triggerDates.length > 0) {
        const periods: PeriodRange[] = [];
        for (let i = 0; i < triggerDates.length; i++) {
          if (triggerDates[i].startsWith(String(year))) {
            periods.push(this.periodRangeForTriggerIndex(triggerDates, i));
          }
        }
        return periods;
      }
    }

    const periods: PeriodRange[] = [];
    for (let month0 = 0; month0 < 12; month0++) {
      periods.push(fixedDayPeriodFromStart(year, month0, settings.anchorDay));
    }
    return periods;
  }

  async listPeriodsWithTransactions(): Promise<PeriodInfo[]> {
    const allTx = await this.txRepo.find({ select: ['transactionDate'] });
    if (allTx.length === 0) return [];

    const dates = allTx.map((t) => t.transactionDate).sort();
    const minYear = Number(dates[0].split('-')[0]);
    const maxYear = Number(dates[dates.length - 1].split('-')[0]);

    const adjustments = await this.overrideRepo.find();
    const adjMap = new Map(adjustments.map((a) => [a.originalStart, a]));

    const seen = new Set<string>();
    const allPeriods: PeriodRange[] = [];
    for (let y = minYear; y <= maxYear + 1; y++) {
      for (const p of await this.listPeriodsInYear(y)) {
        if (!seen.has(p.start)) {
          seen.add(p.start);
          allPeriods.push(p);
        }
      }
    }

    const result: PeriodInfo[] = [];
    for (const period of allPeriods) {
      const adj = adjMap.get(period.start);
      const effectiveStart = adj?.customStart ?? period.start;
      const effectiveEnd = adj?.customEnd ?? period.end;

      const count = dates.filter(
        (d) => d >= effectiveStart && (effectiveEnd === null || d <= effectiveEnd),
      ).length;

      if (count === 0) continue;

      result.push({
        originalStart: period.start,
        start: effectiveStart,
        end: effectiveEnd,
        transactionCount: count,
        hasAdjustment: !!adj,
      });
    }

    return result.sort((a, b) => b.start.localeCompare(a.start));
  }

  async setPeriodAdjustment(originalStart: string, dto: UpdatePeriodOverrideDto): Promise<PeriodInfo[]> {
    if (dto.customEnd && dto.customStart > dto.customEnd) {
      throw new BadRequestException('Startdatum moet voor einddatum liggen');
    }

    const prevOriginalStart = await this.getComputedAdjacentOriginalStart(originalStart, 'prev');
    const nextOriginalStart = await this.getComputedAdjacentOriginalStart(originalStart, 'next');

    // Validate: new start must leave room for the prev period (at least 1 day)
    if (prevOriginalStart) {
      const prevAdj = await this.overrideRepo.findOne({ where: { originalStart: prevOriginalStart } });
      const prevEffectiveStart = prevAdj?.customStart ?? prevOriginalStart;
      if (dto.customStart <= prevEffectiveStart) {
        throw new BadRequestException(`Startdatum moet na ${prevEffectiveStart} liggen`);
      }
    }

    // Validate: new end must leave room for the next period (at least 1 day)
    if (nextOriginalStart && dto.customEnd) {
      const nextAdj = await this.overrideRepo.findOne({ where: { originalStart: nextOriginalStart } });
      const nextComputedPeriod = await this.getComputedPeriod(nextOriginalStart);
      const nextEffectiveEnd = nextAdj?.customEnd ?? nextComputedPeriod.end;
      if (nextEffectiveEnd && dto.customEnd >= nextEffectiveEnd) {
        throw new BadRequestException(`Einddatum moet voor ${nextEffectiveEnd} liggen`);
      }
    }

    // Save the main adjustment (manual, not auto-cascaded)
    await this.upsertAdjustment(originalStart, dto.customStart, dto.customEnd ?? null, false);

    // Cascade to prev: set prev.end = newStart - 1
    if (prevOriginalStart) {
      const prevAdj = await this.overrideRepo.findOne({ where: { originalStart: prevOriginalStart } });
      const newPrevEnd = addDays(dto.customStart, -1);
      const prevCustomStart = prevAdj?.customStart ?? prevOriginalStart;
      // Keep the prev adj's autoCascaded flag if it was already manually set
      const cascadeFlag = !prevAdj || prevAdj.autoCascaded;
      await this.upsertAdjustment(prevOriginalStart, prevCustomStart, newPrevEnd, cascadeFlag);
    }

    // Cascade to next: set next.start = newEnd + 1
    if (nextOriginalStart && dto.customEnd) {
      const nextAdj = await this.overrideRepo.findOne({ where: { originalStart: nextOriginalStart } });
      const nextComputedPeriod = await this.getComputedPeriod(nextOriginalStart);
      const newNextStart = addDays(dto.customEnd, 1);
      const nextCustomEnd = nextAdj?.customEnd ?? nextComputedPeriod.end;
      const cascadeFlag = !nextAdj || nextAdj.autoCascaded;
      await this.upsertAdjustment(nextOriginalStart, newNextStart, nextCustomEnd, cascadeFlag);
    }

    return this.listPeriodsWithTransactions();
  }

  async removePeriodAdjustment(originalStart: string): Promise<PeriodInfo[]> {
    const prevOriginalStart = await this.getComputedAdjacentOriginalStart(originalStart, 'prev');
    const nextOriginalStart = await this.getComputedAdjacentOriginalStart(originalStart, 'next');

    await this.overrideRepo.delete({ originalStart });

    // Remove auto-cascaded adjustments on adjacent periods
    if (prevOriginalStart) {
      const prevAdj = await this.overrideRepo.findOne({ where: { originalStart: prevOriginalStart } });
      if (prevAdj?.autoCascaded) {
        await this.overrideRepo.delete({ originalStart: prevOriginalStart });
      }
    }
    if (nextOriginalStart) {
      const nextAdj = await this.overrideRepo.findOne({ where: { originalStart: nextOriginalStart } });
      if (nextAdj?.autoCascaded) {
        await this.overrideRepo.delete({ originalStart: nextOriginalStart });
      }
    }

    return this.listPeriodsWithTransactions();
  }
}
