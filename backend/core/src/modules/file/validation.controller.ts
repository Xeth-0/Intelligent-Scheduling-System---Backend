import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ValidationService } from './validation.service';
import { RabbitDto, ValidatedDataType } from './dtos/validation-result.dto';

@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}
  @EventPattern('csv_validation_response')
  async handleValidationResponse(
    @Payload() payload: RabbitDto<ValidatedDataType[]>,
    @Ctx() context: RmqContext,
  ) {
    return this.validationService.handleValidationResult(payload, context);
  }
}
