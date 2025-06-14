// import {
//   Injectable,
//   Inject,
//   Get,
//   Param,
//   Logger,
//   BadRequestException,
//   InternalServerErrorException,
// } from '@nestjs/common';
// import { ClientProxy } from '@nestjs/microservices';
// import { firstValueFrom } from 'rxjs';
// import amqp from 'amqp-connection-manager';
// import { ValidationQueuedDto } from './dtos/validation-queued.dto';
// import { randomUUID, UUID } from 'crypto';
// import { PrismaService } from '@/prisma/prisma.service';
// import { Prisma, TaskStatus } from '@prisma/client';
// @Injectable()
// export class FileService {
//   // Inject the RabbitMQ client
//   constructor(
//     @Inject('CSV_SERVICE') private readonly client: ClientProxy,
//     private prismaService: PrismaService,
//   ) {}
//   private logger = new Logger(FileService.name);
//   // Send CSV file to Python service for validation (non-blocking)
//   async queueValidationTask(
//     file: Express.Multer.File,
//     category: string,
//     adminId: string,
//     campusId?: string,
//     fileName?: string,
//   ): Promise<ValidationQueuedDto> {
//     try {
//       if (!file?.buffer) {
//         throw new BadRequestException('File buffer is missing or invalid');
//       }
//       // Convert file buffer to base64 for safe transmission
//       const fileData = file.buffer.toString('base64');
//       // Generate a unique task ID (for tracking purposes)
//       const taskId = randomUUID();
//       // Emit the CSV file to the RabbitMQ queue without waiting for a response

//       this.logger.log('Queuing task:: ', taskId);
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
//       const result = await firstValueFrom(
//         this.client.emit('csv_validation_request', {
//           taskId: taskId,
//           fileData: fileData,
//           category: category,
//           adminId: adminId,
//           campusId: campusId,
//         }),
//       );
//       if (!result) {
//         throw new InternalServerErrorException(
//           'Failed to send file to validation service',
//         );
//       }
//       this.logger.log('file queued: ', taskId);
//       // save in db
//       await this.prismaService.task.create({
//         data: {
//           taskId: taskId,
//           adminId: adminId,
//           campusId: campusId,
//           fileName: fileName ?? file.originalname,
//           status: TaskStatus.QUEUED,
//           errorCount: 0,
//         },
//       });
//       // Immediately return a response to the client
//       return { message: 'File queued for validation', taskId: taskId };
//     } catch (error) {
//       const err = error as Error;
//       this.logger.error('failed to queue', error);
//       if (error instanceof Prisma.PrismaClientKnownRequestError) {
//         switch (error.code) {
//           case 'P2002':
//             throw new InternalServerErrorException(
//               'Duplicate entry for unique field - ',
//               err.message,
//             );
//           case 'P2003':
//             throw new InternalServerErrorException(
//               'Foreign key constraint failed - referenced item not found - ',
//               err.message,
//             );
//           case 'P2000':
//             throw new InternalServerErrorException(
//               'Field value too long - ',
//               err.message,
//             );
//           case 'P2025':
//             throw new InternalServerErrorException(
//               'Entity not found - ',
//               err.message,
//             );
//           default:
//             throw new InternalServerErrorException(
//               'Database Error - ',
//               err.message,
//             );
//         }
//       } else if (error instanceof InternalServerErrorException) {
//         throw error;
//       }
//       throw new InternalServerErrorException(
//         'An unexpected error occurred - ',
//         err.message,
//       );
//     }
//   }
// }

import {
  Injectable,
  Inject,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { ValidationQueuedDto } from './dtos/validation-queued.dto';
import { randomUUID } from 'crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, TaskStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';

@Injectable()
export class FileService {
  constructor(
    @Inject('CSV_SERVICE') private readonly client: ClientProxy,
    private prismaService: PrismaService,
  ) {}
  private logger = new Logger(FileService.name);

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
}
