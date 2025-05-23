import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ValidationService } from './validaton.service';

@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}
  @EventPattern('csv_validation_response')
  async handleValidationResponse(
    @Payload() payload: any,
    @Ctx() context: RmqContext,
  ) {
    return this.validationService.handleValidationResult(payload, context);
  }
}
