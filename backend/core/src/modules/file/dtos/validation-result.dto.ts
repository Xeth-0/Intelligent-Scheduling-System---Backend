export class ValidationResultDto {
  success!: boolean;
  errors!: any[];
  data!: any[];
}

export class RabbitDto {
  taskId!: string;
  result!: ValidationResultDto;
}
