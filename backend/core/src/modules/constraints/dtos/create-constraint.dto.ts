import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import {
  CONSTRAINT_DEFINITIONS,
  ConstraintDefinitionKey,
} from './constraints.types';

export class CreateConstraintDto {
  @ApiProperty({
    description: 'The type of constraint to create',
    enum: Object.keys(CONSTRAINT_DEFINITIONS),
  })
  @IsString()
  @IsNotEmpty()
  constraintTypeKey!: ConstraintDefinitionKey;

  @ApiProperty({
    description: 'The constraint value (varies by constraint type)',
    example: {
      days: ['MONDAY', 'TUESDAY'],
      timeslotCodes: ['0900_1000', '1000_1100'],
      preference: 'PREFER',
    },
  })
  @IsNotEmpty()
  value!: Record<string, unknown>;

  @ApiProperty({
    description: 'Priority of the constraint (1-10)',
    minimum: 1,
    maximum: 10,
    default: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  priority?: number = 5;
}
