import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { ValidationQueuedDto } from './dtos/validation-queued.dto';

@Controller()
export class FileController {
  constructor(private readonly appService: FileService) {}

  // Endpoint to handle CSV file uploads
  @Post('upload')
  @UseInterceptors(FileInterceptor('file')) // Handle file uploads with Multer
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ValidationQueuedDto> {
    // Call the service to validate the CSV file
    return this.appService.queueValidationTask(file);
  }
}
