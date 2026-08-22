import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { DepreciationsService } from './depreciations.service';
import { CreateDepreciationDto, UpdateDepreciationDto } from './dto/depreciation.dto';

@Controller('api/depreciations')
export class DepreciationsController {
  constructor(private readonly service: DepreciationsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get('summary') getSummary() { return this.service.getSummary(); }
  @Post() create(@Body() dto: CreateDepreciationDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDepreciationDto) { return this.service.update(id, dto); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
