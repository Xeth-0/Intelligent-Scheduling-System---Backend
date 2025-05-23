import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { RabbitDto } from './dtos/validation-result.dto';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);

 
  handleValidationResult(@Payload() data: RabbitDto, @Ctx() context: RmqContext) {
    console.log(data);

    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    // channel.ack(originalMsg);
    const a = channel.ack(originalMsg);
    console.log('a', a);
  }
}