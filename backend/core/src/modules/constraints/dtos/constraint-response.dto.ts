import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ConstraintResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  constraintTypeId!: string;

  @ApiProperty()
  @Expose()
  value!: Record<string, unknown>;

  @ApiProperty()
  @Expose()
  weight!: number;

  @ApiProperty()
  @Expose()
  isActive!: boolean;

  @ApiProperty()
  @Expose()
  teacherId!: string | null;

  @ApiProperty()
  @Expose()
  campusId!: string | null;

  @ApiProperty({ required: false })
  @Expose()
  constraintType?: {
    id: string;
    name: string;
    description: string;
    category: string;
    valueType: string;
  };
}
