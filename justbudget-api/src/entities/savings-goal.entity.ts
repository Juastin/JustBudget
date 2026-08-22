import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('savings_goals')
export class SavingsGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  targetAmount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  reservedAmount: number;
}
