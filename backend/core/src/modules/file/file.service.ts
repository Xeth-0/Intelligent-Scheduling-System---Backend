import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ValidationQueuedDto } from './dtos/validation-queued.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, TaskStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { fileConfig } from '@/config';

@Injectable()
export class FileService {
  constructor(
    @Inject('CSV_SERVICE') private readonly client: ClientProxy,
    private prismaService: PrismaService,
  ) {}
  private logger = new Logger(FileService.name);
  private readonly templatesDir = fileConfig.templates.path;

  async queueValidationTask(
    file: Express.Multer.File,
    category: string,
    adminId: string,
    campusId?: string,
    fileName?: string,
    description?: string,
  ): Promise<ValidationQueuedDto> {
    const taskId = randomUUID();
    try {
      if (!file?.buffer) {
        throw new BadRequestException('File buffer is missing or invalid');
      }

      // Convert file buffer to base64 for safe transmission
      const fileData = file.buffer.toString('base64');
      // Generate a unique task ID

      this.logger.log(`Queuing task: ${taskId}`);

      // Emit the CSV file to the RabbitMQ queue (non-blocking)
      this.client.emit('csv_validation_request', {
        taskId,
        fileData,
        category,
        adminId,
        campusId,
      });

      this.logger.log(`File queued: ${taskId}`);

      // Save task in database
      await this.prismaService.task.create({
        data: {
          taskId,
          adminId,
          campusId,
          fileName: fileName ?? file.originalname,
          status: TaskStatus.QUEUED,
          errorCount: 0,
          description: description,
        },
      });

      // Return success response
      return { message: 'File queued for validation', taskId };
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed to queue task ${taskId}: ${err.message}`,
        err.stack,
      );

      // Handle Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002':
            throw new BadRequestException(
              `Duplicate task ID or unique constraint violation: ${err.message}`,
            );
          case 'P2003':
            throw new BadRequestException(
              `Foreign key constraint failed (e.g., invalid adminId or campusId): ${err.message}`,
            );
          case 'P2000':
            throw new BadRequestException(
              `Field value too long: ${err.message}`,
            );
          case 'P2025':
            throw new BadRequestException(
              `Referenced entity not found: ${err.message}`,
            );
          default:
            throw new InternalServerErrorException(
              `Database error (${error.code}): ${err.message}`,
            );
        }
      }

      // Handle RabbitMQ connection errors (from client.emit)
      if (
        err.message.includes('ECONNREFUSED') ||
        err.message.includes('Channel closed')
      ) {
        throw new InternalServerErrorException(
          `Failed to connect to RabbitMQ broker: ${err.message}`,
        );
      }

      // Rethrow existing InternalServerErrorException
      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle unexpected errors
      throw new InternalServerErrorException(
        `Unexpected error while queuing task: ${err.message}`,
      );
    }
  }

  async downloadTemplate(category: string): Promise<{
    buffer: Buffer;
    filename: string;
  }> {
    try {
      // Ensure templates directory exists
      if (!fs.existsSync(this.templatesDir)) {
        fs.mkdirSync(this.templatesDir, { recursive: true });
      }

      const templatePath = path.join(
        this.templatesDir,
        `${category.toLowerCase()}.csv`,
      );

      this.logger.log('template path: ', templatePath);
      if (!fs.existsSync(templatePath)) {
        throw new NotFoundException(
          `Template for category '${category.toLowerCase()}' not found`,
        );
      }

      // Create a read stream
      const fileStream = fs.createReadStream(templatePath);
      const chunks: Buffer[] = [];

      // Read the file in chunks
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }

      // Combine chunks into a single buffer
      const buffer = Buffer.concat(chunks);
      return {
        buffer,
        filename: `${category}_template.csv`,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const err = error as Error;
      this.logger.error(
        `Failed to download template: ${err.message}`,
        err.stack,
      );
      throw new InternalServerErrorException('Failed to download template');
    }
  }
}
