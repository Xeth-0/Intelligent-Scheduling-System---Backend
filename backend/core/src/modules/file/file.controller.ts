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
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';
import { ValidationQueuedDto } from './dtos/validation-queued.dto';
import { ApiTags } from '@nestjs/swagger';
import {
  UploadFileDocs,
  DownloadTemplateDocs,
} from '@/common/decorators/swagger/file.swagger.docs';
import { UploadFileDto } from './dtos/upload.dto';
import { ApiResponse } from '@/common/response/api-response.dto';
import { GetUser, Roles } from '@/common/decorators/auth';
import { Role, User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Response } from 'express';

@Controller('file')
@ApiTags('file')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class FileController {
  constructor(
    private readonly fileService: FileService,
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
    const { message, taskId } = await this.fileService.queueValidationTask(
      file,
      category,
      result.adminId,
      result?.campusId,
      undefined,
      description,
    );
    return ApiResponse.success(201, taskId, message);
  }

  // async downloadTemplate(
  //   @Param('category') category: string,
  //   @Res() res: Response,
  // ): Promise<void> {
  //   const { buffer, filename } = this.fileService.downloadTemplate(category);

  //   res.set({
  //     'Content-Type': 'text/csv',
  //     'Content-Disposition': `attachment; filename="${filename}"`,
  //   });

  //   res.send(buffer);
  // }
  @Get('template/:category')
  @DownloadTemplateDocs()
  @Roles(Role.ADMIN)
  async downloadTemplate(
    @Param('category') category: string,
    @Res() res: Response,
  ): Promise<void> {
    const allowed = [
      'student',
      'course',
      'teacher',
      'department',
      'classroom',
      'sgcourse',
      'studentgroup',
    ];
    console.log(category.toLowerCase());
    if (!allowed.includes(category.toLowerCase())) {
      throw new BadRequestException('Invalid template category');
    }

    const { buffer, filename } =
      await this.fileService.downloadTemplate(category);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
/**
 curl -X POST http://localhost:3000/auth/login   -H "Content-Type: application/json"   -d '{
        "email": "admin1@email.email",
        "password": "adminpassword1"
      }'
 */
