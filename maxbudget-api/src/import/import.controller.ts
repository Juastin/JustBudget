import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';

@Controller('api/import')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post('preview')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.service.preview(file.buffer, file.originalname);
  }

  @Post('confirm')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  confirm(@UploadedFile() file: Express.Multer.File) {
    return this.service.confirm(file.buffer, file.originalname);
  }
}
