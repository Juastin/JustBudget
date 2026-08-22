import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type ReservationType = 'afschrijving' | 'terugkerend' | 'eenmalig';

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'varchar' })
  type: ReservationType;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true, default: null })
  residualValue: number | null;

  @Column('int')
  intervalMonths: number;

  @Column({ type: 'varchar', nullable: true, default: null })
  startDate: string | null;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  savedAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}
