import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CategoryRulesService } from './category-rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';

@Controller('api/category-rules')
export class CategoryRulesController {
  constructor(private readonly service: CategoryRulesService) {}

  @Get() findAll() { return this.service.findAll(); }

  @Post() createOrUpdate(@Body() dto: CreateRuleDto) { return this.service.createOrUpdate(dto); }

  @Post(':id/apply') applyToAll(@Param('id', ParseIntPipe) id: number) {
    return this.service.applyToAll(id);
  }

  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
