import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type PeriodMode = 'FIXED_DAY' | 'TRANSACTION';

@Entity('period_settings')
export class PeriodSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: 'FIXED_DAY' })
  mode: PeriodMode;

  @Column({ type: 'int', default: 20 })
  anchorDay: number;

  @Column({ type: 'varchar', nullable: true })
  triggerDescription: string | null;
}
