import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  ClassSerializerInterceptor,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { ValidationQueuedDto } from './dtos/validation-queued.dto';
import { ApiTags } from '@nestjs/swagger';
import { UploadFileDocs } from 'src/common/decorators/swagger/file.swagger.docs';
import { UploadFileDto } from './dtos/upload.dto';
import { ApiResponse } from '@/common/response/api-response.dto';
import { GetUser, Roles } from '@/common/decorators/auth';
import { Role, User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
@Controller('file')
@ApiTags('file')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileController {
  constructor(
    private readonly appService: FileService,
    private readonly prismaService: PrismaService,
  ) {}

  // Endpoint to handle CSV file uploads
  @Post('upload')
  @UploadFileDocs()
  @UseInterceptors(FileInterceptor('file')) // Handle file uploads with Multer
  @Roles(Role.ADMIN)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadFileDto,
    @GetUser() user: User,
  ): Promise<ApiResponse<string>> {
    const { category, description } = body;
    const { userId } = user;
    const result = await this.prismaService.admin.findFirst({
      where: {
        userId,
      },
      select: {
        adminId: true,
        campusId: true,
      },
    });
    if (!result?.adminId) {
      throw new NotFoundException('Admin not found');
    }
    // Call the service to validate the CSV file
    const { message, taskId } = await this.appService.queueValidationTask(
      file,
      category,
      result.adminId,
      result?.campusId,
      undefined,
      description,
    );
    const response = new ApiResponse<string>({
      success: true,
      message: message,
      data: taskId,
    });
    return response;
  }
}
/**
 curl -X POST http://localhost:3000/auth/login   -H "Content-Type: application/json"   -d '{
        "email": "admin1@email.email",
        "password": "adminpassword1"
      }'
 */
