import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RabbitDto, ValidatedDataType } from './dtos/validation-result.dto';
import { SeedDatabase } from './seedDatabase.service';
import { Channel, ConsumeMessage, Message } from 'amqplib';
import { PrismaService } from '@/prisma/prisma.service';
import { TaskStatus } from '@prisma/client';
import { TaskDetailDto, TaskDto } from './dtos/task.dto';

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
          await this.seedDatabase.seed(data.result.data, data.result.type);
        this.logger.log(
          `Successfully processed validation result for ${data.result.type}, adminId: ${data.adminId}, campusId: ${data.campusId}, taskId: ${data.taskId}`,
        );
        const proms = [
          await this.prismaService.task.update({
            where: {
              taskId: data.taskId,
            },
            data: {
              status: TaskStatus.COMPLETED,
              errorCount: errors.length,
            },
          }),
          await this.prismaService.taskError.createMany({
            data: errors.map((error) => ({
              taskId: data.taskId,
              message: error,
            })),
          }),
        ];
        await Promise.all(proms);
      } else {
        this.logger.error(
          `Validation failed with ${data.result.errors.length} errors`,
        );
        const errorProms = [
          await this.prismaService.task.update({
            where: {
              taskId: data.taskId,
            },
            data: {
              status: TaskStatus.FAILED,
              errorCount: data.result.errors.length,
            },
          }),
          await this.prismaService.taskError.createMany({
            data: data.result.errors.map((error) => ({
              taskId: data.taskId,
              message: error,
            })),
          }),
        ];
        await Promise.all(errorProms);
      }
      // const channel = context.getChannelRef();
      // const originalMsg = context.getMessage();
      // // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      // channel.ack(originalMsg);

      return;
    } catch (error) {
      this.logger.error('Failed to process validation result', error);
      throw error; // Rethrow the error
    }
  }

  // GET /status -> list of tasks
  // @GetUser() user: User
  async getAllTasks(): Promise<TaskDto[]> {
    const tasks = await this.prismaService.task.findMany();
    if (!tasks) {
      throw new NotFoundException('No Task Found');
    }
    return tasks;
    // return await this.prismaService.task.findMany();
  }

  // GET /status/:taskId -> detail of a single task

  async getTaskById(taskId?: string): Promise<TaskDetailDto> {
    const task = await this.prismaService.task.findFirst({
      where: {
        taskId,
      },
    });
    const errors = await this.prismaService.taskError.findMany({
      where: {
        taskId,
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return {
      taskId: task.taskId,
      errors: errors.map((error) => error.message),
    };
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
