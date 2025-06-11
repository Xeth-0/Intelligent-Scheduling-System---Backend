import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsEnum,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduledSessionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scheduleId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classroomId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classroomName!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  classGroupIds!: string[];

  @ApiProperty({ enum: SessionType })
  @IsEnum(SessionType)
  sessionType!: SessionType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  timeslot!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  day!: string;
}

// Schema 2: Nested map structure
export type ScheduleMap = Record<
  string,
  Record<string, Record<string, ScheduledSessionDto>>
>;

export class GeneralScheduleResponse {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scheduleId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  scheduleName!: string;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isActive!: boolean;

  @ApiProperty({ type: [ScheduledSessionDto] })
  @ValidateNested({ each: true })
  @Type(() => ScheduledSessionDto)
  sessions!: ScheduledSessionDto[];
}

export class TeacherScheduleResponse {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherName!: string;

  @ApiProperty({ type: [ScheduledSessionDto] })
  @ValidateNested({ each: true })
  @Type(() => ScheduledSessionDto)
  sessions!: ScheduledSessionDto[];
}

export class ClassroomScheduleResponse {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classroomId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classroomName!: string;

  @ApiProperty({ type: [ScheduledSessionDto] })
  @ValidateNested({ each: true })
  @Type(() => ScheduledSessionDto)
  sessions!: ScheduledSessionDto[];
}

export class ClassGroupScheduleResponse {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classGroupId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classGroupName!: string;

  @ApiProperty()
  @ValidateNested()
  scheduleMap!: ScheduleMap;
}
