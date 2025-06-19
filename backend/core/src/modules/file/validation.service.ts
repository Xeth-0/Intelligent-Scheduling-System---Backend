import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RabbitDto, ValidatedDataType } from './dtos/validation-result.dto';
import { SeedDatabase } from './seedDatabase.service';
import { Channel, ConsumeMessage, Message } from 'amqplib';
import { PrismaService } from '@/prisma/prisma.service';
import { TaskStatus, TaskSeverity } from '@prisma/client';
import { TaskDetailDto, TaskDto } from './dtos/task.dto';
import {
  PaginatedResponse,
  PaginationData,
} from '@/common/response/api-response.dto';

// Interface for validation errors from Python service
interface PythonValidationError {
  row?: number;
  column?: string;
  message?: string;
  severity?: string;
}

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(
    private readonly seedDatabase: SeedDatabase,
    private prismaService: PrismaService,
  ) {}

  async handleValidationResult(
    @Payload() data: RabbitDto<ValidatedDataType[]>,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    try {
      this.logger.log(`Processing validation result for ${data.result.type}`);
      if (data.result.success) {
        const { errors, erroneousItems, successfulRecords } =
          await this.seedDatabase.seed(
            data.result.data,
            data.result.type,
            data.taskId,
            data.adminId,
            data.campusId || '',
          );
        this.logger.log(
          `Successfully processed validation result for ${data.result.type}, adminId: ${data.adminId}, campusId: ${data.campusId}, taskId: ${data.taskId}`,
        );
        console.log('Seeding errors: ', ...errors);

        // Debug: Check if all errors have correct taskId
        const invalidErrors = errors.filter(
          (error) => !error.taskId || error.taskId !== data.taskId,
        );
        if (invalidErrors.length > 0) {
          this.logger.error('Found errors with invalid taskId:', invalidErrors);
        }

        // Execute operations in a transaction to ensure consistency
        await this.prismaService.$transaction(async (tx) => {
          // First update the task
          await tx.task.update({
            where: {
              taskId: data.taskId,
            },
            data: {
              status: TaskStatus.COMPLETED,
              errorCount: errors.length,
            },
          });

          // Only create task errors if there are any
          if (errors.length > 0) {
            await tx.taskError.createMany({
              data: errors,
            });
          }
        });
      } else {
        this.logger.error(
          `Validation failed with ${data.result.errors.length} errors`,
        );

        // Convert Python validation errors to TaskError format
        const validationErrors = (
          data.result.errors as PythonValidationError[]
        ).map((error, index: number) => ({
          taskId: data.taskId,
          row: error.row || index + 1,
          column: error.column || null,
          message: error.message || JSON.stringify(error),
          severity: (error.severity as TaskSeverity) || TaskSeverity.ERROR,
          createdAt: new Date(),
        }));

        // Execute operations in a transaction to ensure consistency
        await this.prismaService.$transaction(async (tx) => {
          // First update the task
          await tx.task.update({
            where: {
              taskId: data.taskId,
            },
            data: {
              status: TaskStatus.FAILED,
              errorCount: validationErrors.length,
            },
          });

          // Only create task errors if there are any
          if (validationErrors.length > 0) {
            await tx.taskError.createMany({
              data: validationErrors,
            });
          }
        });

        console.log('Validation errors: ', validationErrors);
      }

      return;
    } catch (error) {
      this.logger.error('Failed to process validation result', error);
      throw error; // Rethrow the error
    }
  }

  // GET /status -> list of tasks
  // @GetUser() user: User
  async getAllTasks(
    page: number,
    size: number,
  ): Promise<PaginatedResponse<TaskDto>> {
    const skip = (page - 1) * size;

    const [items, totalItems] = await Promise.all([
      this.prismaService.task.findMany({
        skip: skip,
        take: size,
        orderBy: [{ createdAt: 'desc' }],
      }),
      this.prismaService.task.count({}),
    ]);

    const tasks = await this.prismaService.task.findMany();
    if (!tasks) {
      throw new NotFoundException('No Task Found');
    }
    const totalPages = Math.ceil(totalItems / size);
    const paginaltedData: PaginationData = {
      totalItems: totalItems,
      currentPage: page,
      totalPages: totalPages,
      itemsPerPage: size,
    };

    return new PaginatedResponse<TaskDto>(items, paginaltedData);
    // return await this.prismaService.task.findMany();
  }

  // GET /status/:taskId -> detail of a single task

  async getTaskById(taskId?: string): Promise<TaskDetailDto> {
    const task = await this.prismaService.task.findFirst({
      where: {
        taskId,
      },
    });
    // const errors = await this.prismaService.taskError.findMany({
    //   where: {
    //     taskId,
    //   },
    // });
    const errors = await this.prismaService.taskError.findMany({
      where: {
        taskId,
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return {
      ...task,
      errors: errors,
    };
  }

  async deleteTaskById(taskId: string): Promise<TaskDto> {
    const task = await this.prismaService.task.findFirst({
      where: {
        taskId,
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    await this.prismaService.taskError.deleteMany({
      where: {
        taskId,
      },
    });
    await this.prismaService.task.delete({
      where: {
        taskId,
      },
    });
    return task;
  }
}

// if (errors.length > 0) {
//         this.logger.warn(
//           `Encountered ${errors.length} errors during seeding`,
//           ...errors,
//         );
// Optionally: Send errors to a dead-letter queue or monitoring system
// }
// return [error, erroneousItems]
// const channel = context.getChannelRef();
// const originalMsg = context.getMessage();
// await channel.ack(originalMsg);
