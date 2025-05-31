import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TimeslotResponseDto {
  @ApiProperty()
  @Expose()
  timeslotId!: string;

  @ApiProperty()
  @Expose()
  code!: string;

  @ApiProperty()
  @Expose()
  label!: string;

  @ApiProperty()
  @Expose()
  startTime!: string;

  @ApiProperty()
  @Expose()
  endTime!: string;

  @ApiProperty()
  @Expose()
  order!: number;
}
