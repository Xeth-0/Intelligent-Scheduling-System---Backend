import {
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek, SessionType } from '@prisma/client';

// Interface for the schedule session details
export class ScheduleItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  classroomId!: string;

  @ApiProperty({ enum: SessionType })
  @IsOptional()
  sessionType?: SessionType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  endTime!: string;

  @ApiProperty({ enum: DayOfWeek })
  @IsNotEmpty()
  day!: DayOfWeek;
}

// Interface for a single class group's schedule (timeslot -> details)
export type ClassGroupSchedule = Record<string, ScheduleItemDto>;

// Interface for the full general schedule (classGroupId -> timeslot -> details)
export type Schedule = Record<string, ClassGroupSchedule>;

// Wrapper class for validation and serialization
export class GeneralScheduleWrapperDto {
  @ApiProperty({
    description: 'Schedule organized by class group and timeslot',
  })
  @ValidateNested({ each: true })
  @Type(() => ScheduleItemDto)
  schedule!: Schedule;
}

// Query parameter DTO for filtering schedules
export class ScheduleQueryParamsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  classGroupId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  classroomId?: string;
}

// Keeping mock data for reference
export const generalMockSchedule = {
  schedule: {
    class1: {
      '1': { teacherId: 'T001', subjectId: 'S001', classroomId: 'C001' },
      '10': { teacherId: 'T002', subjectId: 'S002', classroomId: 'C002' },
      '19': { teacherId: 'T003', subjectId: 'S003', classroomId: 'C003' },
      '28': { teacherId: 'T004', subjectId: 'S004', classroomId: 'C004' },
      '37': { teacherId: 'T005', subjectId: 'S005', classroomId: 'C005' },
      '3': { teacherId: 'T002', subjectId: 'S001', classroomId: 'C002' },
      '12': { teacherId: 'T003', subjectId: 'S002', classroomId: 'C003' },
    },
    class2: {
      '2': { teacherId: 'T002', subjectId: 'S002', classroomId: 'C002' },
      '11': { teacherId: 'T003', subjectId: 'S003', classroomId: 'C003' },
      '20': { teacherId: 'T004', subjectId: 'S004', classroomId: 'C004' },
      '29': { teacherId: 'T005', subjectId: 'S005', classroomId: 'C005' },
      '38': { teacherId: 'T001', subjectId: 'S001', classroomId: 'C001' },
      '4': { teacherId: 'T003', subjectId: 'S002', classroomId: 'C003' },
      '13': { teacherId: 'T004', subjectId: 'S003', classroomId: 'C004' },
      '22': { teacherId: 'T005', subjectId: 'S004', classroomId: 'C005' },
    },
    class3: {
      '5': { teacherId: 'T004', subjectId: 'S003', classroomId: 'C004' },
      '14': { teacherId: 'T005', subjectId: 'S004', classroomId: 'C005' },
      '23': { teacherId: 'T001', subjectId: 'S005', classroomId: 'C001' },
      '32': { teacherId: 'T002', subjectId: 'S001', classroomId: 'C002' },
      '41': { teacherId: 'T003', subjectId: 'S002', classroomId: 'C003' },
      '7': { teacherId: 'T005', subjectId: 'S003', classroomId: 'C005' },
    },
    class4: {
      '6': { teacherId: 'T001', subjectId: 'S004', classroomId: 'C001' },
      '15': { teacherId: 'T002', subjectId: 'S005', classroomId: 'C002' },
      '24': { teacherId: 'T003', subjectId: 'S001', classroomId: 'C003' },
      '33': { teacherId: 'T004', subjectId: 'S002', classroomId: 'C004' },
      '42': { teacherId: 'T005', subjectId: 'S003', classroomId: 'C005' },
      '8': { teacherId: 'T002', subjectId: 'S004', classroomId: 'C002' },
      '17': { teacherId: 'T003', subjectId: 'S005', classroomId: 'C003' },
      '26': { teacherId: 'T004', subjectId: 'S001', classroomId: 'C004' },
    },
    class5: {
      '9': { teacherId: 'T003', subjectId: 'S005', classroomId: 'C003' },
      '18': { teacherId: 'T004', subjectId: 'S001', classroomId: 'C004' },
      '27': { teacherId: 'T005', subjectId: 'S002', classroomId: 'C005' },
      '36': { teacherId: 'T001', subjectId: 'S003', classroomId: 'C001' },
      '45': { teacherId: 'T002', subjectId: 'S004', classroomId: 'C002' },
      '16': { teacherId: 'T005', subjectId: 'S005', classroomId: 'C005' },
    },
  },
};
