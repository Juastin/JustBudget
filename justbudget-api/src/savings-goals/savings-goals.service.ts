import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavingsGoal } from '../entities/savings-goal.entity';
import { CreateSavingsGoalDto, UpdateSavingsGoalDto } from './dto/savings-goal.dto';

@Injectable()
export class SavingsGoalsService {
  constructor(@InjectRepository(SavingsGoal) private readonly repo: Repository<SavingsGoal>) {}

  private shape(g: SavingsGoal) {
    return { id: g.id, name: g.name, targetAmount: Number(g.targetAmount), reservedAmount: Number(g.reservedAmount) };
  }

  async findAll() { return (await this.repo.find({ order: { name: 'ASC' } })).map((g) => this.shape(g)); }

  async create(dto: CreateSavingsGoalDto) {
    const goal = this.repo.create({ ...dto, reservedAmount: dto.reservedAmount ?? 0 });
    return this.shape(await this.repo.save(goal));
  }

  async update(id: number, dto: UpdateSavingsGoalDto) {
    const goal = await this.repo.findOneBy({ id });
    if (!goal) throw new NotFoundException('Spaardoel niet gevonden');
    Object.assign(goal, dto);
    return this.shape(await this.repo.save(goal));
  }

  async remove(id: number) {
    const goal = await this.repo.findOneBy({ id });
    if (!goal) throw new NotFoundException('Spaardoel niet gevonden');
    await this.repo.remove(goal);
  }
}
