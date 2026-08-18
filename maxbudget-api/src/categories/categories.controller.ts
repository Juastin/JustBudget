import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get() findAll() { return this.service.findAll(); }

  @Post() create(@Body() dto: CreateCategoryDto) { return this.service.create(dto); }

  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
