import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryRule } from '../entities/category-rule.entity';
import { Category } from '../entities/category.entity';
import { Transaction } from '../entities/transaction.entity';
import { CategoryRulesController } from './category-rules.controller';
import { CategoryRulesService } from './category-rules.service';

@Module({
  imports: [TypeOrmModule.forFeature([CategoryRule, Category, Transaction])],
  controllers: [CategoryRulesController],
  providers: [CategoryRulesService],
  exports: [CategoryRulesService],
})
export class CategoryRulesModule {}
