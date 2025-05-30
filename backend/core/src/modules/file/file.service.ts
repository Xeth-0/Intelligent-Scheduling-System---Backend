import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import amqp from 'amqp-connection-manager';
import { ValidationQueuedDto } from './dtos/validation-queued.dto';
import { randomUUID, UUID } from 'crypto';
@Injectable()
export class FileService {
  // Inject the RabbitMQ client
  constructor(@Inject('CSV_SERVICE') private readonly client: ClientProxy) {}

  // Send CSV file to Python service for validation (non-blocking)
  queueValidationTask(
    file: Express.Multer.File,
    category: string,
  ): ValidationQueuedDto {
    // Convert file buffer to base64 for safe transmission
    const fileData = file.buffer.toString('base64');
    // Generate a unique task ID (for tracking purposes)
    const taskId = randomUUID();
    // Emit the CSV file to the RabbitMQ queue without waiting for a response
    const message = {
      task: 'csv_validation_request', // Matches the @app.task name
      args: [taskId, fileData, category], // Arguments for validate_csv
      kwargs: {},
      id: taskId, // Task ID for tracking
      content_type: 'application/json',
      content_encoding: 'utf-8',
    };

    console.log('to queue');
    this.client.emit('csv_validation_request', {
      taskId: taskId,
      fileData: fileData,
      category: category,
    });
    console.log('queued');
    // Immediately return a response to the client
    return { message: 'File queued for validation', taskId: taskId };
  }
}
