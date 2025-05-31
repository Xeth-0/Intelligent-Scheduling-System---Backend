import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ConstraintTypeResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty()
  @Expose()
  description!: string | null;

  @ApiProperty()
  @Expose()
  category!: string;

  @ApiProperty()
  @Expose()
  valueType!: string;

  @ApiProperty()
  @Expose()
  jsonSchema!: Record<string, unknown>;

  @ApiProperty()
  @Expose()
  isActive!: boolean;
}
