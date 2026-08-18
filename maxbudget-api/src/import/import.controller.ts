import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportService } from './import.service';

@Controller('api/import')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  @Post('pdf-preview')
  @UseInterceptors(FileInterceptor('file', { storage: undefined })) // memoryStorage
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.service.preview(file.buffer);
  }

  @Post('pdf-confirm')
  @UseInterceptors(FileInterceptor('file', { storage: undefined }))
  confirm(@UploadedFile() file: Express.Multer.File) {
    return this.service.confirm(file.buffer);
  }
}
