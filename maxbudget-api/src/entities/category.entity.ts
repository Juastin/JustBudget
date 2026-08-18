import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Budget } from './budget.entity';
import { Transaction } from './transaction.entity';
import { CategoryRule } from './category-rule.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  color: string;

  @OneToMany(() => Budget, (b) => b.category)
  budgets: Budget[];

  @OneToMany(() => Transaction, (t) => t.category)
  transactions: Transaction[];

  @OneToMany(() => CategoryRule, (r) => r.category)
  rules: CategoryRule[];
}
