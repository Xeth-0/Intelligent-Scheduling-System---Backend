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
  // Teacher preferences
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
      preference: z.enum(['PREFER', 'AVOID', 'NEUTRAL']),
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
    }),
  } satisfies ConstraintTypeDefinition<BooleanConstraintValue>,

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
};

export type ConstraintDefinitionKey = keyof typeof CONSTRAINT_DEFINITIONS;
