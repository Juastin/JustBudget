import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './category.entity';

@Entity('budgets')
export class Budget {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  categoryId: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ default: false })
  notifyPaid: boolean;

  @Column({ type: 'int', nullable: true, default: 80 })
  warnThreshold: number | null;

  @ManyToOne(() => Category, (c) => c.budgets, { onDelete: 'CASCADE' })
  category: Category;
}
