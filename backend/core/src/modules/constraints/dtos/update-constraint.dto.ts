import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional, IsBoolean } from 'class-validator';

export class UpdateConstraintDto {
  @ApiProperty({
    description: 'The constraint value (varies by constraint type)',
    example: {
      days: ['MONDAY', 'TUESDAY'],
      timeslotCodes: ['0900_1000', '1000_1100'],
      preference: 'PREFER',
    },
    required: false,
  })
  @IsOptional()
  value?: Record<string, unknown>;

  @ApiProperty({
    description: 'Weight/priority of the constraint (1-10)',
    minimum: 1,
    maximum: 10,
    required: false,
  })
  @IsNumber()
  @Min(1)
  @Max(10)
  @IsOptional()
  weight?: number;

  @ApiProperty({
    description: 'Whether the constraint is active (admin only)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
