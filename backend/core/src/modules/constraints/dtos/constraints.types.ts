import { z } from 'zod';
import {
  ConstraintCategory,
  ConstraintValueType,
  DayOfWeek,
} from '@prisma/client';

export interface ConstraintTypeDefinition<T> {
  id: string;
  name: string;
  description: string;
  category: ConstraintCategory;
  valueType: ConstraintValueType;
  jsonSchema: z.ZodSchema<T>;
}

export interface RoomConstraintValue {
  roomIds?: string[];
  buildingIds?: string[];
  preference: 'PREFER' | 'AVOID';
}

export interface TimeslotConstraintValue {
  days: DayOfWeek[];
  timeslotCodes: string[]; // e.g., ["0900_1000", "1000_1100"]
  preference: 'PREFER' | 'AVOID' | 'NEUTRAL';
}

export interface BooleanConstraintValue {
  enabled: boolean;
}

export interface WorkloadDistributionConstraintValue {
  preferredMaxSessionsPerDay: number;
  avoidBackToBackSessions: boolean;
}

export interface EctsPriorityConstraintValue {
  enabled: boolean;
  threshold: number; // ECTS threshold for high-priority courses
}

export interface RoomUtilizationConstraintValue {
  enabled: boolean;
  // maxCapacityRatio: number; // e.g., 1.5 means room can be 150% of student count
}

export interface TeacherMaxSessionsConstraintValue {
  enabled: boolean;
  defaultMaxSessionsPerDay: number; // campus-wide default
}

export interface ConsecutiveMovementConstraintValue {
  enabled: boolean;
  teacherPriority: number; // relative weight for teacher movement penalties
  studentPriority: number; // relative weight for student movement penalties
}

export interface TeacherCompactnessConstraintValue {
  enabled: boolean;
  maxGapsPerDay: number; // maximum gaps allowed per day
  maxActiveDays: number; // maximum teaching days per week
  maxConsecutiveSessions: number; // maximum back-to-back sessions
}

// Valid timeslot codes for validation. This is temporary, more granular timeslot choices will be added later.
export const VALID_TIMESLOT_CODES = [
  '0800_0900',
  '0900_1000',
  '1000_1100',
  '1100_1200',
  '1200_1300',
  '1300_1400',
  '1400_1500',
  '1500_1600',
  '1600_1700',
  '1700_1800',
] as const;

export const CONSTRAINT_DEFINITIONS = {
  // ========== SYSTEM-LEVEL CONSTRAINTS (Admin-controlled, Campus-wide) ==========

  // Courses with ECTS above the threshold are prioritized for earlier time slots
  CAMPUS_ECTS_PRIORITY: {
    id: 'CAMPUS_ECTS_PRIORITY',
    name: 'ECTS Course Priority',
    description: 'Prioritize high-ECTS courses for earlier time slots',
    category: ConstraintCategory.CAMPUS_PREFERENCE,
    valueType: ConstraintValueType.NUMERIC_SCALE,
    jsonSchema: z.object({
      enabled: z.boolean(),
      threshold: z.number().min(1).max(30), // ECTS credit threshold
    }),
  } satisfies ConstraintTypeDefinition<EctsPriorityConstraintValue>,

  CAMPUS_ROOM_UTILIZATION: {
    id: 'CAMPUS_ROOM_UTILIZATION',
    name: 'Efficient Room Utilization',
    description: 'Penalize assigning oversized rooms to small classes',
    category: ConstraintCategory.CAMPUS_PREFERENCE,
    valueType: ConstraintValueType.NUMERIC_SCALE,
    jsonSchema: z.object({
      enabled: z.boolean(),
      // maxCapacityRatio: z.number().min(1.0).max(5.0), // room capacity / student count
    }),
  } satisfies ConstraintTypeDefinition<RoomUtilizationConstraintValue>,

  CAMPUS_TEACHER_MAX_SESSIONS: {
    id: 'CAMPUS_TEACHER_MAX_SESSIONS',
    name: 'Teacher Maximum Sessions Per Day',
    description: 'Campus-wide limit on teacher daily teaching load',
    category: ConstraintCategory.CAMPUS_PREFERENCE,
    valueType: ConstraintValueType.NUMERIC_SCALE,
    jsonSchema: z.object({
      enabled: z.boolean(),
      defaultMaxSessionsPerDay: z.number().min(1).max(8),
    }),
  } satisfies ConstraintTypeDefinition<TeacherMaxSessionsConstraintValue>,

  CAMPUS_CONSECUTIVE_MOVEMENT: {
    id: 'CAMPUS_CONSECUTIVE_MOVEMENT',
    name: 'Minimize Consecutive Room Movement',
    description: 'Reduce movement between rooms for consecutive sessions',
    category: ConstraintCategory.CAMPUS_PREFERENCE,
    valueType: ConstraintValueType.NUMERIC_SCALE,
    jsonSchema: z.object({
      enabled: z.boolean(),
      teacherPriority: z.number().min(0.1).max(10.0),
      studentPriority: z.number().min(0.1).max(10.0),
    }),
  } satisfies ConstraintTypeDefinition<ConsecutiveMovementConstraintValue>,

  // ========== Teacher preferences ==========
  TEACHER_TIME_PREFERENCE: {
    id: 'TEACHER_TIME_PREFERENCE',
    name: 'Teacher Time Preference',
    description: 'A preference for a teacher to teach at specific timeslots',
    category: ConstraintCategory.TEACHER_PREFERENCE,
    valueType: ConstraintValueType.TIME_SLOT,
    jsonSchema: z.object({
      days: z.array(
        z.enum([
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
        ]),
      ),
      timeslotCodes: z
        .array(z.enum(VALID_TIMESLOT_CODES))
        .min(1, 'At least one timeslot must be selected'),
      preference: z.enum(['PREFER', 'AVOID']),
    }),
  } satisfies ConstraintTypeDefinition<TimeslotConstraintValue>,

  TEACHER_SCHEDULE_COMPACTNESS: {
    id: 'TEACHER_SCHEDULE_COMPACTNESS',
    name: 'Teacher Schedule Compactness',
    description: 'A preference for a teacher to have a compact schedule',
    category: ConstraintCategory.TEACHER_PREFERENCE,
    valueType: ConstraintValueType.BOOLEAN,
    jsonSchema: z.object({
      enabled: z.boolean(),
      maxGapsPerDay: z.number().min(0).max(5),
      maxActiveDays: z.number().min(0).max(5),
      maxConsecutiveSessions: z.number().min(1).max(6),
    }),
  } satisfies ConstraintTypeDefinition<TeacherCompactnessConstraintValue>,

  TEACHER_ROOM_PREFERENCE: {
    id: 'TEACHER_ROOM_PREFERENCE',
    name: 'Teacher Room Preference',
    description: 'A preference for a teacher to teach in a specific room',
    category: ConstraintCategory.TEACHER_PREFERENCE,
    valueType: ConstraintValueType.ROOM,
    jsonSchema: z.object({
      roomIds: z.array(z.string()).optional(),
      buildingIds: z.array(z.string()).optional(),
      preference: z.enum(['PREFER', 'AVOID']),
    }),
  } satisfies ConstraintTypeDefinition<RoomConstraintValue>,

  TEACHER_WORKLOAD_DISTRIBUTION: {
    id: 'TEACHER_WORKLOAD_DISTRIBUTION',
    name: 'Teacher Workload Distribution',
    description:
      'Prefer even distribution of teaching sessions across the week',
    category: ConstraintCategory.TEACHER_PREFERENCE,
    valueType: ConstraintValueType.NUMERIC_SCALE,
    jsonSchema: z.object({
      preferredMaxSessionsPerDay: z.number().min(0).max(8),
      avoidBackToBackSessions: z.boolean(),
    }),
  } satisfies ConstraintTypeDefinition<WorkloadDistributionConstraintValue>,
};

export type ConstraintDefinitionKey = keyof typeof CONSTRAINT_DEFINITIONS;
