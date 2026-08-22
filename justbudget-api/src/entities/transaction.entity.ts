import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
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

  @Column({ default: false })
  recurringHint: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Category, (c) => c.transactions, { nullable: true, onDelete: 'SET NULL' })
  category: Category;
}
