import { Injectable, Logger } from '@nestjs/common';
import { MessageHandler, EventPattern } from '@nestjs/microservices';
import { ValidationResultDto } from './dtos/validation-result.dto';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  // Handle validation results from the Python service
  @EventPattern('csv_validation_response')
//   @MessageHandler()
  handleValidationResult(data: ValidationResultDto) {
    // Log the validation result (replace with database storage or other logic)
    this.logger.log(`Received validation result for task ${data.taskId}: ${data.errors.length} errors`);
    this.logger.log(`Validated data: ${JSON.stringify(data.data)}`);
    // TODO: Store result in database or notify client (e.g., via WebSocket)
  }
}