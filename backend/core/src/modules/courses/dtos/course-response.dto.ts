import { type SessionType } from '@prisma/client';

export class CourseResponseDto {
  courseId!: string;
  name!: string;
  code!: string;
  description!: string | null;
  departmentId!: string | null;
  sessionType!: SessionType;
  sessionsPerWeek!: number;
  department?: {
    name: string;
    campusId: string;
  } | null;
}
