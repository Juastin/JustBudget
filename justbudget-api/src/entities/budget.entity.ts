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

  @ManyToOne(() => Category, (c) => c.budgets, { onDelete: 'CASCADE' })
  category: Category;
}
