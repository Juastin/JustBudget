import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ui_settings')
export class UiSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', default: '["Uit eten","Boodschappen"]' })
  spotlightCategories: string;

  @Column({
    type: 'varchar',
    default:
      '{"overBudgetCategories":true,"warnThreshold":true,"paidNotifications":true,"totalUnderBudget":true,"totalOverBudget":true}',
  })
  insightOptions: string;
}
