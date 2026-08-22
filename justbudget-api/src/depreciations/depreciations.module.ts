import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Depreciation } from '../entities/depreciation.entity';
import { DepreciationsController } from './depreciations.controller';
import { DepreciationsService } from './depreciations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Depreciation])],
  controllers: [DepreciationsController],
  providers: [DepreciationsService],
  exports: [DepreciationsService],
})
export class DepreciationsModule {}
