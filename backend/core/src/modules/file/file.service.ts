import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { ValidationQueuedDto } from './dtos/validation-queued.dto';
import { randomUUID, UUID } from 'crypto';
@Injectable()
export class FileService {
  // Inject the RabbitMQ client
  constructor(@Inject('CSV_SERVICE') private readonly client: ClientProxy) {}

  // Send CSV file to Python service for validation (non-blocking)
  async queueValidationTask(
    file: Express.Multer.File,
  ): Promise<ValidationQueuedDto> {
    // Convert file buffer to base64 for safe transmission
    const fileData = file.buffer.toString('base64');
    // Generate a unique task ID (for tracking purposes)
    const taskId = randomUUID();
    // Emit the CSV file to the RabbitMQ queue without waiting for a response
    this.client.emit('csv_validation_request', {
      taskId: taskId,
      fileData: fileData,
    });
    // Immediately return a response to the client
    return { message: 'File queued for validation', taskId: taskId };
  }
}
