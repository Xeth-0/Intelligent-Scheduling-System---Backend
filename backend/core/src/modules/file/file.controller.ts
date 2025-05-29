import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { ValidationQueuedDto } from './dtos/validation-queued.dto';
import { ApiTags } from '@nestjs/swagger';
import { UploadFieDocs } from 'src/common/decorators/swagger/file.swagger.docs';
import { UploadFileDto } from './dtos/upload.dto';
@Controller('file')
@ApiTags('file')
export class FileController {
  constructor(private readonly appService: FileService) {}

  // Endpoint to handle CSV file uploads
  @Post('upload')
  @UploadFieDocs()
  @UseInterceptors(FileInterceptor('file')) // Handle file uploads with Multer
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadFileDto,
  ): Promise<ValidationQueuedDto> {
    const { category } = body;
    // Call the service to validate the CSV file
    return await this.appService.queueValidationTask(file, category);
  }
}
