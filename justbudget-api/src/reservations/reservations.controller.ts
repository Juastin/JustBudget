import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto, UpdateReservationDto } from './dto/reservation.dto';

@Controller('api/reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get('summary') getSummary() { return this.service.getSummary(); }
  @Post() create(@Body() dto: CreateReservationDto) { return this.service.create(dto); }
  @Put(':id') update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReservationDto) { return this.service.update(id, dto); }
  @Delete(':id') @HttpCode(204) remove(@Param('id', ParseIntPipe) id: number) { return this.service.remove(id); }
}
