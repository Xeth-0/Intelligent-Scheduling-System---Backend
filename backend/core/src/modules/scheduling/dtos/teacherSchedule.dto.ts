import {
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { DayOfWeek, SessionType } from '@prisma/client';

// Interface for the teacher schedule details
export class TeacherScheduleItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentGroupId!: string;

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

// Interface for a single teacher's schedule entries
export type TeacherTimeslots = Record<string, TeacherScheduleItemDto>;

// Interface for the full teacher schedule (teacherId -> timeslot -> details)
export type TeacherSchedule = Record<string, TeacherTimeslots>;

// Wrapper class for validation and serialization
export class TeacherScheduleWrapperDto {
  @ApiProperty({
    description: 'Schedule organized by teacher and timeslot',
  })
  @ValidateNested({ each: true })
  @Type(() => TeacherScheduleItemDto)
  schedule!: TeacherSchedule;
}

// Interface for a classroom schedule item
export class ClassroomScheduleItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  studentGroupId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  courseId!: string;

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

// Interface for a classroom's schedule entries
export type ClassroomTimeslots = Record<string, ClassroomScheduleItemDto>;

// Interface for the full classroom schedule (classroomId -> timeslot -> details)
export type ClassroomSchedule = Record<string, ClassroomTimeslots>;

// Wrapper class for validation and serialization
export class ClassroomScheduleWrapperDto {
  @ApiProperty({
    description: 'Schedule organized by classroom and timeslot',
  })
  @ValidateNested({ each: true })
  @Type(() => ClassroomScheduleItemDto)
  schedule!: ClassroomSchedule;
}

// Keeping mock data for reference
export const teacherMockSchedule = {
  schedule: {
    T001: {
      '1': { classGroupId: 'class1', subjectId: 'S001', classroomId: 'C001' },
      '6': { classGroupId: 'class4', subjectId: 'S004', classroomId: 'C001' },
      '23': { classGroupId: 'class3', subjectId: 'S005', classroomId: 'C001' },
      '36': { classGroupId: 'class5', subjectId: 'S003', classroomId: 'C001' },
      '38': { classGroupId: 'class2', subjectId: 'S001', classroomId: 'C001' },
    },
    T002: {
      '2': { classGroupId: 'class2', subjectId: 'S002', classroomId: 'C002' },
      '3': { classGroupId: 'class1', subjectId: 'S001', classroomId: 'C002' },
      '8': { classGroupId: 'class4', subjectId: 'S004', classroomId: 'C002' },
      '10': { classGroupId: 'class1', subjectId: 'S002', classroomId: 'C002' },
      '15': { classGroupId: 'class4', subjectId: 'S005', classroomId: 'C002' },
      '32': { classGroupId: 'class3', subjectId: 'S001', classroomId: 'C002' },
      '45': { classGroupId: 'class5', subjectId: 'S004', classroomId: 'C002' },
    },
    T003: {
      '9': { classGroupId: 'class5', subjectId: 'S005', classroomId: 'C003' },
      '12': { classGroupId: 'class1', subjectId: 'S002', classroomId: 'C003' },
      '17': { classGroupId: 'class4', subjectId: 'S005', classroomId: 'C003' },
      '19': { classGroupId: 'class1', subjectId: 'S003', classroomId: 'C003' },
      '24': { classGroupId: 'class4', subjectId: 'S001', classroomId: 'C003' },
      '41': { classGroupId: 'class3', subjectId: 'S002', classroomId: 'C003' },
    },
    T004: {
      '5': { classGroupId: 'class3', subjectId: 'S003', classroomId: 'C004' },
      '13': { classGroupId: 'class2', subjectId: 'S003', classroomId: 'C004' },
      '18': { classGroupId: 'class5', subjectId: 'S001', classroomId: 'C004' },
      '20': { classGroupId: 'class2', subjectId: 'S004', classroomId: 'C004' },
      '26': { classGroupId: 'class4', subjectId: 'S001', classroomId: 'C004' },
      '28': { classGroupId: 'class1', subjectId: 'S004', classroomId: 'C004' },
      '33': { classGroupId: 'class4', subjectId: 'S002', classroomId: 'C004' },
    },
    T005: {
      '7': { classGroupId: 'class3', subjectId: 'S003', classroomId: 'C005' },
      '14': { classGroupId: 'class3', subjectId: 'S004', classroomId: 'C005' },
      '16': { classGroupId: 'class5', subjectId: 'S005', classroomId: 'C005' },
      '22': { classGroupId: 'class2', subjectId: 'S004', classroomId: 'C005' },
      '27': { classGroupId: 'class5', subjectId: 'S002', classroomId: 'C005' },
      '29': { classGroupId: 'class2', subjectId: 'S005', classroomId: 'C005' },
      '37': { classGroupId: 'class1', subjectId: 'S005', classroomId: 'C005' },
      '42': { classGroupId: 'class4', subjectId: 'S003', classroomId: 'C005' },
    },
  },
};
