import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './category.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column()
  transactionDate: string; // ISO date string 'YYYY-MM-DD'

  @Column({ unique: true })
  hash: string;

  @Column({ nullable: true })
  categoryId: number;

  @Column({ default: false })
  isRecurring: boolean;

  @Column({ nullable: true, default: 'monthly' })
  recurringPeriod: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  linkedExpenseId: number | null;

  @ManyToOne(() => Category, (c) => c.transactions, { nullable: true, onDelete: 'SET NULL' })
  category: Category;

  // Self-reference: a positive transaction (e.g. a Tikkie reimbursement) can be
  // linked to the expense it pays back, so budgets net the two out.
  @ManyToOne(() => Transaction, (t) => t.reimbursements, { nullable: true, onDelete: 'SET NULL' })
  linkedExpense: Transaction | null;

  @OneToMany(() => Transaction, (t) => t.linkedExpense)
  reimbursements: Transaction[];
}
