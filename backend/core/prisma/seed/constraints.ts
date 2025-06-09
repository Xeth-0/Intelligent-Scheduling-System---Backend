import {
  DayOfWeek,
  type PrismaClient,
  type Campus,
  type Teacher,
  type Building,
  type Classroom,
  type Timeslot,
  type Prisma,
} from '@prisma/client';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { CONSTRAINT_DEFINITIONS } from '../../src/modules/constraints/dtos/constraints.types';
import { getRandomElements, getRandomInt, getRandomFloat } from './helpers';

/**
 * Seed constraint data: constraint types and constraint instances
 */

export async function seedConstraintTypes(prisma: PrismaClient) {
  console.log('Seeding constraint types...');

  const constraintTypes = await Promise.all(
    Object.values(CONSTRAINT_DEFINITIONS).map((definition) =>
      prisma.constraintType.create({
        data: {
          id: definition.id,
          name: definition.name,
          description: definition.description,
          category: definition.category,
          valueType: definition.valueType,
          jsonSchema: zodToJsonSchema(
            definition.jsonSchema,
          ) as Prisma.InputJsonValue,
          isActive: true,
        },
      }),
    ),
  );

  console.log('Created constraint types:', constraintTypes.length);
  return constraintTypes;
}

export async function seedCampusConstraints(
  prisma: PrismaClient,
  campus: Campus,
) {
  console.log('Creating campus-level constraints...');

  // ECTS Priority - enabled with threshold of 6 credits
  await prisma.constraint.create({
    data: {
      constraintTypeId: 'CAMPUS_ECTS_PRIORITY',
      value: {
        enabled: true,
        threshold: 6,
      },
      priority: 8.0,
      campusId: campus.campusId,
    },
  });

  // Room Utilization - enabled
  await prisma.constraint.create({
    data: {
      constraintTypeId: 'CAMPUS_ROOM_UTILIZATION',
      value: {
        enabled: true,
      },
      priority: 6.0,
      campusId: campus.campusId,
    },
  });

  // Teacher Max Sessions - enabled with default of 4 sessions per day
  await prisma.constraint.create({
    data: {
      constraintTypeId: 'CAMPUS_TEACHER_MAX_SESSIONS',
      value: {
        enabled: true,
        defaultMaxSessionsPerDay: 4,
      },
      priority: 9.0,
      campusId: campus.campusId,
    },
  });

  // Consecutive Movement - enabled with teacher priority
  await prisma.constraint.create({
    data: {
      constraintTypeId: 'CAMPUS_CONSECUTIVE_MOVEMENT',
      value: {
        enabled: true,
        teacherPriority: 7.0,
        studentPriority: 5.0,
      },
      priority: 7.0,
      campusId: campus.campusId,
    },
  });

  console.log('Created 4 campus-level constraints');
}

export async function seedTeacherConstraints(
  prisma: PrismaClient,
  teachers: Teacher[],
  timeslots: Timeslot[],
  classrooms: Classroom[],
  buildings: Building[],
) {
  console.log('Creating teacher constraints...');

  const timeslotCodes = timeslots.map((ts) => ts.code);
  const classroomIds = classrooms.map((c) => c.classroomId);
  const buildingIds = buildings.map((b) => b.buildingId);

  // Track which constraint types have been assigned to ensure each has at least one teacher
  const teacherConstraintTypesAssigned = new Set<string>();
  const teacherConstraintTypes = [
    'TEACHER_TIME_PREFERENCE',
    'TEACHER_SCHEDULE_COMPACTNESS',
    'TEACHER_ROOM_PREFERENCE',
  ];

  // Assign constraints to 80% of teachers randomly
  const teachersToAssignConstraints = getRandomElements(
    teachers,
    Math.floor(teachers.length * 0.8),
  );

  for (const teacher of teachersToAssignConstraints) {
    // Each teacher gets 1-3 random constraints
    const numConstraints = getRandomInt(1, 3);
    const selectedConstraintTypes = getRandomElements(
      teacherConstraintTypes,
      numConstraints,
    );

    for (const constraintType of selectedConstraintTypes) {
      teacherConstraintTypesAssigned.add(constraintType);

      if (constraintType === 'TEACHER_TIME_PREFERENCE') {
        // Random time preference
        const randomDays = getRandomElements(
          [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
          ],
          getRandomInt(1, 3),
        );
        const randomTimeslots = getRandomElements(
          timeslotCodes,
          getRandomInt(2, 4),
        );
        const preferences = ['PREFER', 'AVOID', 'NEUTRAL'] as const;
        const randomPreference =
          preferences[getRandomInt(0, preferences.length - 1)];

        await prisma.constraint.create({
          data: {
            constraintTypeId: 'TEACHER_TIME_PREFERENCE',
            value: {
              days: randomDays,
              timeslotCodes: randomTimeslots,
              preference: randomPreference,
            },
            priority: getRandomFloat(3.0, 9.0),
            teacherId: teacher.teacherId,
          },
        });
      } else if (constraintType === 'TEACHER_SCHEDULE_COMPACTNESS') {
        // Random compactness preferences
        await prisma.constraint.create({
          data: {
            constraintTypeId: 'TEACHER_SCHEDULE_COMPACTNESS',
            value: {
              enabled: Math.random() > 0.2, // 80% chance enabled
              maxGapsPerDay: getRandomInt(0, 2),
              maxActiveDays: getRandomInt(3, 5),
              maxConsecutiveSessions: getRandomInt(2, 4),
            },
            priority: getRandomFloat(4.0, 8.0),
            teacherId: teacher.teacherId,
          },
        });
      } else if (constraintType === 'TEACHER_ROOM_PREFERENCE') {
        // Random room preferences
        const preferenceType = Math.random() > 0.5 ? 'PREFER' : 'AVOID';
        const useRooms = Math.random() > 0.5;

        await prisma.constraint.create({
          data: {
            constraintTypeId: 'TEACHER_ROOM_PREFERENCE',
            value: {
              roomIds: useRooms
                ? getRandomElements(classroomIds, getRandomInt(1, 2))
                : undefined,
              buildingIds: !useRooms
                ? getRandomElements(buildingIds, 1)
                : undefined,
              preference: preferenceType,
            },
            priority: getRandomFloat(2.0, 7.0),
            teacherId: teacher.teacherId,
          },
        });
      }
    }
  }

  // Ensure each teacher constraint type is used by at least one teacher
  for (const constraintType of teacherConstraintTypes) {
    if (!teacherConstraintTypesAssigned.has(constraintType)) {
      // Find a teacher without this constraint type
      const teacherWithoutConstraint =
        teachers.find(
          (teacher) => !teachersToAssignConstraints.includes(teacher),
        ) ?? teachers[0]; // fallback to first teacher

      if (constraintType === 'TEACHER_TIME_PREFERENCE') {
        await prisma.constraint.create({
          data: {
            constraintTypeId: 'TEACHER_TIME_PREFERENCE',
            value: {
              days: [DayOfWeek.FRIDAY],
              timeslotCodes: ['1600_1700', '1700_1800'],
              preference: 'AVOID',
            },
            priority: 7.0,
            teacherId: teacherWithoutConstraint.teacherId,
          },
        });
      } else if (constraintType === 'TEACHER_SCHEDULE_COMPACTNESS') {
        await prisma.constraint.create({
          data: {
            constraintTypeId: 'TEACHER_SCHEDULE_COMPACTNESS',
            value: {
              enabled: true,
              maxGapsPerDay: 1,
              maxActiveDays: 4,
              maxConsecutiveSessions: 3,
            },
            priority: 6.0,
            teacherId: teacherWithoutConstraint.teacherId,
          },
        });
      } else if (constraintType === 'TEACHER_ROOM_PREFERENCE') {
        await prisma.constraint.create({
          data: {
            constraintTypeId: 'TEACHER_ROOM_PREFERENCE',
            value: {
              buildingIds: buildingIds,
              preference: 'PREFER',
            },
            priority: 5.0,
            teacherId: teacherWithoutConstraint.teacherId,
          },
        });
      }
    }
  }

  const totalConstraints = await prisma.constraint.count();
  console.log(
    `Created ${totalConstraints} total constraints (4 campus + ${totalConstraints - 4} teacher)`,
  );
}
