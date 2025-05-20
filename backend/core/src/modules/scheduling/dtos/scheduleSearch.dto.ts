import { SessionType, DayOfWeek } from '@prisma/client';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';

export class SearchSessionsBody {
  @IsString()
  @IsNotEmpty()
  scheduleId!: string;

  @IsString()
  @IsOptional()
  teacherId?: string;

  @IsString()
  @IsOptional()
  teacherFirstName?: string;

  @IsString()
  @IsOptional()
  teacherLastName?: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  courseName?: string;

  @IsString()
  @IsOptional()
  @IsEnum(SessionType)
  sessionType?: SessionType;

  @IsString()
  @IsOptional()
  @IsEnum(DayOfWeek)
  day?: DayOfWeek;

  @IsString()
  @IsOptional()
  classroomId?: string;
  @IsString()
  @IsOptional()
  classroomName?: string;

  @IsString()
  @IsOptional()
  classroomBuildingId?: string;

  @IsString()
  @IsOptional()
  classroomBuildingName?: string;

  @IsBoolean()
  @IsOptional()
  classroomAccessibility?: boolean;

  @IsString()
  @IsOptional()
  studentGroupId?: string;

  @IsString()
  @IsOptional()
  studentGroupName?: string;

  @IsBoolean()
  @IsOptional()
  studentGroupAccessibility?: boolean;
}
