import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('period_overrides')
export class PeriodOverride {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true })
  originalStart: string;

  @Column({ type: 'varchar' })
  customStart: string;

  @Column({ type: 'varchar', nullable: true })
  customEnd: string | null;

  @Column({ type: 'boolean', default: false })
  autoCascaded: boolean;
}
