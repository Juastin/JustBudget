import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

// An expected one-off payment (e.g. a Klarna installment) that hasn't hit the bank
// account yet. It counts as expected spending until an imported transaction settles it.
@Entity('planned_payments')
export class PlannedPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  // Stored as a positive number
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  dueDate: string; // ISO date string 'YYYY-MM-DD'

  @CreateDateColumn()
  createdAt: Date;
}
