import {
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ScheduledItemDto } from './scheduledItem.dto';
import { Type } from 'class-transformer';

class SchedulingData {
  @Type(() => ScheduledItemDto)
  best_schedule!: ScheduledItemDto[];

  best_fitness!: number;
}

export class SchedulingApiResponseDto {
  @IsString()
  @IsNotEmpty()
  status!: string;

  @IsString()
  @IsNotEmpty()
  message!: string;

  @IsObject()
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => SchedulingData)
  data!: SchedulingData;
}
