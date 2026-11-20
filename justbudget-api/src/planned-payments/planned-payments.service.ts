import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlannedPayment } from '../entities/planned-payment.entity';
import { Transaction } from '../entities/transaction.entity';
import { PeriodsService } from '../periods/periods.service';

const CANDIDATE_WINDOW_DAYS = 60;
const SEARCH_WINDOW_DAYS = 180;
const MAX_CANDIDATES = 15;

function dayNumber(date: string): number {
  return Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

function dayToDate(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}

@Injectable()
export class PlannedPaymentsService {
  constructor(
    @InjectRepository(PlannedPayment) private readonly repo: Repository<PlannedPayment>,
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
    private readonly periodsService: PeriodsService,
  ) {}

  // An unlinked expense with exactly the same amount near the due date probably is the real
  // payment. Until the user links it, that money is counted twice (as the planned payment
  // and as spending), so we flag it. We deliberately don't drop the planned payment from the
  // totals by ourselves: an unrelated expense with the same amount would silently skew them.
  private async findLikelyPaid(p: PlannedPayment) {
    const dueDay = dayNumber(p.dueDate);
    const cents = Math.round(Number(p.amount) * 100);
    const rows = await this.txRepo
      .createQueryBuilder('t')
      .where('t.amount < 0')
      .andWhere('t.settledPlannedName IS NULL')
      .andWhere('t.transactionDate >= :from AND t.transactionDate <= :to', {
        from: dayToDate(dueDay - CANDIDATE_WINDOW_DAYS),
        to: dayToDate(dueDay + CANDIDATE_WINDOW_DAYS),
      })
      .getMany();
    const closest = rows
      .filter((t) => Math.round(-Number(t.amount) * 100) === cents)
      .sort((a, b) => Math.abs(dayNumber(a.transactionDate) - dueDay) - Math.abs(dayNumber(b.transactionDate) - dueDay))[0];
    return closest
      ? { id: closest.id, description: closest.description, transactionDate: closest.transactionDate }
      : null;
  }

  private async shape(p: PlannedPayment) {
    return {
      id: p.id,
      name: p.name,
      amount: Number(p.amount),
      dueDate: p.dueDate,
      likelyPaid: await this.findLikelyPaid(p),
    };
  }

  async findAll() {
    const rows = await this.repo.find({ order: { dueDate: 'ASC', id: 'ASC' } });
    return Promise.all(rows.map((p) => this.shape(p)));
  }

  async findInPeriod(periodStart?: string) {
    const { start, end } = await this.periodsService.getPeriod(periodStart);
    const qb = this.repo.createQueryBuilder('p').where('p.dueDate >= :start', { start });
    if (end) qb.andWhere('p.dueDate <= :end', { end });
    const rows = await qb.orderBy('p.dueDate', 'ASC').getMany();
    return Promise.all(rows.map((p) => this.shape(p)));
  }

  async create(dto: { name: string; amount: number; dueDate: string }) {
    const saved = await this.repo.save(
      this.repo.create({ name: dto.name.trim(), amount: Math.abs(dto.amount), dueDate: dto.dueDate }),
    );
    return this.shape(saved);
  }

  // Expenses that could be the real payment behind a planned payment, most likely first.
  // Ranked on closeness of amount (most important), closeness of date, and whether the
  // description shares a word with the planned payment's name (e.g. "Klarna").
  //
  // Transactions already linked to a planned payment are left out, and so is anything far
  // from the due date. Without `search` that window is narrow; with `search` it is wider
  // and only expenses whose description contains the text are included.
  async findCandidates(id: number, search?: string) {
    const planned = await this.repo.findOneBy({ id });
    if (!planned) throw new NotFoundException('Geplande betaling niet gevonden');

    const plannedAmount = Number(planned.amount);
    const dueDay = dayNumber(planned.dueDate);
    const term = search?.trim().toLowerCase();
    const windowDays = term ? SEARCH_WINDOW_DAYS : CANDIDATE_WINDOW_DAYS;

    const qb = this.txRepo
      .createQueryBuilder('t')
      .where('t.amount < 0')
      .andWhere('t.settledPlannedName IS NULL')
      .andWhere('t.transactionDate >= :from AND t.transactionDate <= :to', {
        from: dayToDate(dueDay - windowDays),
        to: dayToDate(dueDay + windowDays),
      });
    if (term) {
      const escaped = term.replace(/[\\%_]/g, '\\$&');
      qb.andWhere("LOWER(t.description) LIKE :term ESCAPE '\\'", { term: `%${escaped}%` });
    }
    const rows = await qb.getMany();

    const words = planned.name
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3);

    return rows
      .map((t) => {
        const amount = Number(t.amount);
        const amountDiff = Math.round((Math.abs(amount) - plannedAmount) * 100) / 100;
        const dayDiff = dayNumber(t.transactionDate) - dueDay;
        const description = t.description.toLowerCase();
        const nameMatch = words.some((w) => description.includes(w));
        const score =
          Math.min(Math.abs(amountDiff) / Math.max(plannedAmount, 1), 3) * 2 +
          Math.abs(dayDiff) / 30 -
          (nameMatch ? 1 : 0);
        return {
          id: t.id,
          description: t.description,
          amount,
          transactionDate: t.transactionDate,
          amountDiff,
          dayDiff,
          nameMatch,
          score,
        };
      })
      .sort((a, b) => a.score - b.score || b.id - a.id)
      .slice(0, MAX_CANDIDATES)
      .map(({ score: _score, ...rest }) => rest);
  }

  // The real transaction exists: remember on it which planned payment it settled (so it is
  // not suggested again) and release the reservation by removing the planned payment.
  async settle(id: number, transactionId: number) {
    const planned = await this.repo.findOneBy({ id });
    if (!planned) throw new NotFoundException('Geplande betaling niet gevonden');
    const tx = await this.txRepo.findOneBy({ id: transactionId });
    if (!tx) throw new NotFoundException('Transactie niet gevonden');
    if (tx.settledPlannedName) throw new BadRequestException('Deze transactie is al gekoppeld aan een geplande betaling');

    tx.settledPlannedName = planned.name;
    await this.txRepo.save(tx);
    await this.repo.remove(planned);
  }

  async remove(id: number) {
    const p = await this.repo.findOneBy({ id });
    if (!p) throw new NotFoundException('Geplande betaling niet gevonden');
    await this.repo.remove(p);
  }
}
