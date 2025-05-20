// ! This is for the microservice communication.

import { DayOfWeek, SessionType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  ArrayNotEmpty,
  Matches,
  IsBoolean,
  ValidateNested,
  IsObject,
} from 'class-validator';

class SchedulingData {
  @Type(() => ScheduledSessionResponseDto)
  best_schedule!: ScheduledSessionResponseDto[];

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

export class ScheduledSessionResponseDto {
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @IsString()
  @IsNotEmpty()
  courseName!: string;

  @IsEnum(SessionType)
  @IsNotEmpty()
  sessionType!: SessionType;

  @IsString()
  @IsNotEmpty()
  teacherId!: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'studentGroupIds should not be empty' })
  @IsString({ each: true, message: 'Each studentGroupId must be a string' })
  studentGroupIds!: string[];

  @IsString()
  @IsNotEmpty()
  classroomId!: string;

  // The original DTO had `timeSlot: TimeSlot` which was an error as `TimeSlot` enum for ranges is not defined.
  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)-([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'timeslot must be in HH:MM-HH:MM format (e.g., 08:00-09:30)',
  })
  timeslot!: string; // Field name changed from timeSlot to timeslot to match Python model

  @IsEnum(DayOfWeek)
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }: { value: string }) => value.toUpperCase())
  day!: DayOfWeek;

  @IsBoolean()
  is_valid_hard!: boolean;

  @IsBoolean()
  is_valid_soft!: boolean;

  // Note: startTime and endTime fields were removed from this DTO.
  // They are not part of the Python scheduledSession model received from the scheduling service.
  // Instead, they are derived from the `timeslot` field within scheduling.service.ts
  // before saving to the database.
}

export type ScheduledSessionResponse = ScheduledSessionResponseDto;
