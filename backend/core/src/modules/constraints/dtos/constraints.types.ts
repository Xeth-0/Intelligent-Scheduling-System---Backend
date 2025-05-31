import { z } from 'zod';
import {
  ConstraintScope,
  ConstraintValueType,
  DayOfWeek,
} from '@prisma/client';

export interface ConstraintTypeDefinition<T> {
  id: string;
  name: string;
  description: string;
  category: ConstraintScope;
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
  startTime: string;
  endTime: string;
  preference: 'PREFER' | 'AVOID' | 'NEUTRAL';
}

export interface BooleanConstraintValue {
  enabled: boolean;
}

export const CONSTRAINT_DEFINITIONS = {
  // Teacher preferences
  TEACHER_TIME_PREFERENCE: {
    id: 'TEACHER_TIME_PREFERENCE',
    name: 'Teacher Time Preference',
    description: 'A preference for a teacher to teach at a specific time',
    category: ConstraintScope.TEACHER_PREFERENCE,
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
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
      endTime: z.string().regex(/^\d{2}:\d{2}$/),
      preference: z.enum(['PREFER', 'AVOID', 'NEUTRAL']),
    }),
  } satisfies ConstraintTypeDefinition<TimeslotConstraintValue>,

  TEACHER_SCHEDULE_COMPACTNESS: {
    id: 'TEACHER_SCHEDULE_COMPACTNESS',
    name: 'Teacher Schedule Compactness',
    description: 'A preference for a teacher to have a compact schedule',
    category: ConstraintScope.TEACHER_PREFERENCE,
    valueType: ConstraintValueType.BOOLEAN,
    jsonSchema: z.object({
      enabled: z.boolean(),
    }),
  } satisfies ConstraintTypeDefinition<BooleanConstraintValue>,

  TEACHER_ROOM_PREFERENCE: {
    id: 'TEACHER_ROOM_PREFERENCE',
    name: 'Teacher Room Preference',
    description: 'A preference for a teacher to teach in a specific room',
    category: ConstraintScope.TEACHER_PREFERENCE,
    valueType: ConstraintValueType.ROOM,
    jsonSchema: z.object({
      roomIds: z.array(z.string()).optional(),
      buildingIds: z.array(z.string()).optional(),
      preference: z.enum(['PREFER', 'AVOID']),
    }),
  } satisfies ConstraintTypeDefinition<RoomConstraintValue>,
};

export type ConstraintDefinitionKey = keyof typeof CONSTRAINT_DEFINITIONS;
