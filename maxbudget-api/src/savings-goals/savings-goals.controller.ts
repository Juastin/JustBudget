import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { SavingsGoalsService } from './savings-goals.service';
import { CreateSavingsGoalDto, UpdateSavingsGoalDto } from './dto/savings-goal.dto';

@Controller('api/savings-goals')
export class SavingsGoalsController {
  constructor(private readonly service: SavingsGoalsService) {}
  @Get() findAll() { return this.service.findAll(); }
  @Post() create(@Body() dto: CreateSavingsGoalDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSavingsGoalDto) { return this.service.update(id, dto); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
