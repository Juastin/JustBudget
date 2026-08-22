import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Category } from './category.entity';

@Entity('category_rules')
export class CategoryRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  keyword: string;

  @Column()
  categoryId: number;

  @ManyToOne(() => Category, (c) => c.rules, { onDelete: 'CASCADE' })
  category: Category;
}
