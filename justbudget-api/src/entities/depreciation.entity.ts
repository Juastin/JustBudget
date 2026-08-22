import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('depreciations')
export class Depreciation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('decimal', { precision: 10, scale: 2 })
  buyPrice: number;

  @Column('int')
  lifespanMonths: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  residualValue: number;

  @Column({ nullable: true })
  category: string;

  @Column({ nullable: true })
  buyDate: string;

  @CreateDateColumn()
  createdAt: Date;
}
