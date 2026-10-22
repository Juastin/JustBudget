import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('period_boundaries')
export class PeriodBoundary {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  date: string;
}
