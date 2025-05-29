import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RabbitDto } from './dtos/validation-result.dto';
import { SeedDatabase } from './seedDatabase.service';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

  constructor(private readonly seedDatabase: SeedDatabase) {}

  @EventPattern('validation_result')
  async handleValidationResult(
    @Payload() data: RabbitDto,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    try {
      this.logger.log(`Processing validation result for ${data.result.type}`);

      const { errors, erroneousItems } = await this.seedDatabase.seed(
        data.result.data,
        data.result.type,
      );

      if (errors.length > 0) {
        this.logger.warn(
          `Encountered ${errors.length} errors during seeding`,
          errors,
        );
        // Optionally: Send errors to a dead-letter queue or monitoring system
      }

      const channel = context.getChannelRef();
      const originalMsg = context.getMessage();
      await channel.ack(originalMsg);
    } catch (error) {
      this.logger.error('Failed to process validation result', error);
      throw error; // Or handle based on your error strategy
    }
  }
}
