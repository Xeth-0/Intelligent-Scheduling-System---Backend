import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import {
  Role,
  ConstraintType,
  Constraint,
  Prisma,
  ConstraintValueType,
  ConstraintCategory,
} from '@prisma/client';
import {
  VALID_TIMESLOT_CODES,
  CONSTRAINT_DEFINITIONS,
  ConstraintDefinitionKey,
} from './dtos/constraints.types';
import { CreateConstraintDto, UpdateConstraintDto } from './dtos';
import { zodToJsonSchema } from 'zod-to-json-schema';

@Injectable()
export class ConstraintService implements OnModuleInit {
  private constraintTypeMap = new Map<ConstraintDefinitionKey, string>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedConstraintTypes();
  }

  /**
   * Seeds constraint types from CONSTRAINT_DEFINITIONS into the database
   */
  private async seedConstraintTypes(): Promise<void> {
    for (const [key, definition] of Object.entries(CONSTRAINT_DEFINITIONS)) {
      const existingType = await this.prisma.constraintType.findFirst({
        where: { name: definition.name },
      });

      let constraintType: ConstraintType;

      if (!existingType) {
        constraintType = await this.prisma.constraintType.create({
          data: {
            name: definition.name,
            description: definition.description,
            category: definition.category,
            valueType: definition.valueType,
            jsonSchema: zodToJsonSchema(
              definition.jsonSchema,
            ) as Prisma.JsonObject,
          },
        });
      } else {
        constraintType = existingType;
      }

      this.constraintTypeMap.set(
        key as ConstraintDefinitionKey,
        constraintType.id,
      );
    }
  }

  /**
   * Validates if timeslot codes are valid
   */
  private validateTimeslotCodes(timeslotCodes: string[]): boolean {
    return timeslotCodes.every((code) =>
      (VALID_TIMESLOT_CODES as readonly string[]).includes(code),
    );
  }

  /**
   * Validate if a time preference conflicts with existing constraints
   */
  private async validateTeacherTimePreference(
    teacherId: string,
    timeslotCodes: string[],
    preference: 'PREFER' | 'AVOID' | 'NEUTRAL',
  ): Promise<{
    hasConflict: boolean;
    conflicts: Array<{
      conflictingConstraintId: string;
      timeslotCode: string;
      existingPreference: string;
      newPreference: string;
    }>;
  }> {
    // Skip conflict checking for NEUTRAL preferences
    if (preference === 'NEUTRAL') {
      return {
        hasConflict: false,
        conflicts: [],
      };
    }

    // Validate timeslot codes first
    if (!this.validateTimeslotCodes(timeslotCodes)) {
      throw new BadRequestException('Invalid timeslot codes provided');
    }

    // Get existing time preferences for this teacher
    const existingConstraints = await this.prisma.constraint.findMany({
      where: {
        teacherId,
        isActive: true,
        constraintType: {
          // name: 'Teacher Time Preference',
          valueType: ConstraintValueType.TIME_SLOT,
          category: ConstraintCategory.TEACHER_PREFERENCE,
        },
      },
      include: {
        constraintType: true,
      },
    });

    const conflicts: Array<{
      conflictingConstraintId: string;
      timeslotCode: string;
      existingPreference: string;
      newPreference: string;
    }> = [];

    // Check each timeslot for conflicts
    for (const code of timeslotCodes) {
      for (const constraint of existingConstraints) {
        const constraintValue = constraint.value as {
          timeslotCodes?: string[];
          preference?: string;
        };

        if (
          constraintValue.timeslotCodes?.includes(code) &&
          constraintValue.preference !== preference &&
          constraintValue.preference !== 'NEUTRAL' // Don't conflict with NEUTRAL
        ) {
          conflicts.push({
            conflictingConstraintId: constraint.id,
            timeslotCode: code,
            existingPreference: constraintValue.preference ?? 'UNKNOWN',
            newPreference: preference,
          });
        }
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  /**
   * Creates a new constraint for a user
   */
  async createConstraint(
    userId: string,
    createDto: CreateConstraintDto,
  ): Promise<Constraint> {
    const constraintDefinition =
      CONSTRAINT_DEFINITIONS[createDto.constraintTypeKey];
    if (!constraintDefinition) {
      throw new BadRequestException(
        `Constraint type ${createDto.constraintTypeKey} not found`,
      );
    }

    // Validate the constraint value against the schema
    const validatedValue = constraintDefinition.jsonSchema.parse(
      createDto.value,
    );

    // Get constraint type UUID from database
    const constraintTypeId = this.constraintTypeMap.get(
      createDto.constraintTypeKey,
    );
    if (!constraintTypeId) {
      throw new BadRequestException(
        `Constraint type ${createDto.constraintTypeKey} not properly seeded`,
      );
    }

    // Determine the type of user and validate permissions
    const user = await this.prisma.user.findFirst({
      where: { userId },
      include: {
        teacher: true,
        admin: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === Role.STUDENT) {
      throw new BadRequestException('Students cannot create constraints');
    }

    // Check for time preference conflicts if this is a time preference constraint
    if (
      createDto.constraintTypeKey === 'TEACHER_TIME_PREFERENCE' &&
      user.teacher
    ) {
      const timeValue = validatedValue as {
        timeslotCodes: string[];
        preference: 'PREFER' | 'AVOID' | 'NEUTRAL';
      };

      const conflictCheck = await this.validateTeacherTimePreference(
        user.teacher.teacherId,
        timeValue.timeslotCodes,
        timeValue.preference,
      );

      if (conflictCheck.hasConflict) {
        const conflictMessages = conflictCheck.conflicts.map(
          (conflict) =>
            `Timeslot ${conflict.timeslotCode}: existing preference is ${conflict.existingPreference}, new preference is ${conflict.newPreference}`,
        );
        throw new BadRequestException(
          `Time preference conflicts detected: ${conflictMessages.join('; ')}`,
        );
      }
    }

    // TODO: Implement constraint limits (max 10 constraints per teacher)
    // const existingConstraints = await this.prisma.constraint.count({
    //   where: {
    //     teacherId: user.teacher?.teacherId,
    //     constraintTypeId,
    //     isActive: true,
    //   },
    // });
    // if (existingConstraints >= 10) {
    //   throw new BadRequestException('Maximum number of constraints reached (10)');
    // }

    return this.prisma.constraint.create({
      data: {
        constraintTypeId,
        campusId: user.admin ? user.admin.campusId : null,
        teacherId: user.teacher ? user.teacher.teacherId : null,
        value: validatedValue as Prisma.JsonObject,
        priority: createDto.priority ?? 5.0,
      },
      include: {
        constraintType: true,
      },
    });
  }

  /**
   * Returns all constraints for a user
   */
  async getAllConstraints(userId: string): Promise<Constraint[]> {
    const user = await this.prisma.user.findFirst({
      where: { userId },
      include: {
        teacher: true,
        admin: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === Role.STUDENT) {
      throw new BadRequestException('Students cannot access constraints');
    }

    const whereClause =
      user.role === Role.TEACHER
        ? { teacherId: user.teacher?.teacherId }
        : { campusId: user.admin?.campusId };

    return this.prisma.constraint.findMany({
      where: whereClause,
      include: {
        constraintType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Returns available constraint types for campus (for teachers to view)
   */
  async getCampusConstraintTypes(userId: string): Promise<ConstraintType[]> {
    const user = await this.prisma.user.findFirst({
      where: { userId },
      include: {
        teacher: true,
      },
    });

    if (!user?.teacher) {
      throw new ForbiddenException(
        'Only teachers can view campus constraint types',
      );
    }

    return this.prisma.constraintType.findMany({
      where: {
        isActive: true,
        category: ConstraintCategory.CAMPUS_PREFERENCE, // Only campus-level constraint types
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  /**
   * Returns all available constraint types (for UI to show options)
   */
  async getConstraintTypes(): Promise<ConstraintType[]> {
    return this.prisma.constraintType.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        category: 'asc',
      },
    });
  }

  /**
   * Updates an existing constraint
   */
  async updateConstraint(
    constraintId: string,
    userId: string,
    updateDto: UpdateConstraintDto,
  ): Promise<Constraint> {
    const constraint = await this.prisma.constraint.findUnique({
      where: { id: constraintId },
      include: {
        constraintType: true,
      },
    });

    if (!constraint) {
      throw new NotFoundException('Constraint not found');
    }

    const user = await this.prisma.user.findFirst({
      where: { userId },
      include: {
        teacher: true,
        admin: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check ownership permissions
    const isOwner = user.teacher
      ? constraint.teacherId === user.teacher.teacherId
      : user.admin
        ? constraint.campusId === user.admin.campusId
        : false;

    if (!isOwner) {
      throw new ForbiddenException('You can only update your own constraints');
    }

    // Only admins can change isActive status
    if (updateDto.isActive !== undefined && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can change constraint status');
    }

    let validatedValue = constraint.value;
    if (updateDto.value) {
      // Find the constraint definition for validation
      const constraintDef = Object.values(CONSTRAINT_DEFINITIONS).find(
        (def) => def.name === constraint.constraintType.name,
      );

      if (constraintDef) {
        validatedValue = constraintDef.jsonSchema.parse(updateDto.value);

        // Check for conflicts if updating time preferences
        if (
          constraint.constraintType.name === 'Teacher Time Preference' &&
          user.teacher
        ) {
          const timeValue = validatedValue as {
            timeslotCodes: string[];
            preference: 'PREFER' | 'AVOID' | 'NEUTRAL';
          };

          const conflictCheck = await this.validateTeacherTimePreference(
            user.teacher.teacherId,
            timeValue.timeslotCodes,
            timeValue.preference,
          );

          // Filter out conflicts with the current constraint
          const relevantConflicts = conflictCheck.conflicts.filter(
            (conflict) => {
              if (conflict.conflictingConstraintId === constraintId) {
                // This is the constraint being updated.
                return false;
              }
              // This would need more sophisticated logic to check if the conflict
              // is with a different constraint instance
              return true;
            },
          );

          if (relevantConflicts.length > 0) {
            const conflictMessages = relevantConflicts.map(
              (conflict) =>
                `Timeslot ${conflict.timeslotCode}: existing preference is ${conflict.existingPreference}, new preference is ${conflict.newPreference}`,
            );
            throw new BadRequestException(
              `Time preference conflicts detected: ${conflictMessages.join('; ')}`,
            );
          }
        }
      }
    }

    // Finally, update the constraint now that everything is validated.
    return this.prisma.constraint.update({
      where: { id: constraintId },
      data: {
        value: validatedValue as Prisma.JsonObject,
        priority: updateDto.priority,
        isActive: updateDto.isActive,
      },
      include: {
        constraintType: true,
      },
    });
  }

  /**
   * Deletes a constraint
   */
  async deleteConstraint(constraintId: string, userId: string): Promise<void> {
    const constraint = await this.prisma.constraint.findUnique({
      where: { id: constraintId },
    });

    if (!constraint) {
      throw new NotFoundException('Constraint not found');
    }

    const user = await this.prisma.user.findFirst({
      where: { userId },
      include: {
        teacher: true,
        admin: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check ownership permissions
    const isOwner =
      (user.teacher && constraint.teacherId === user.teacher.teacherId) ??
      (user.admin && constraint.campusId === user.admin.campusId);

    if (!isOwner) {
      throw new ForbiddenException('You can only delete your own constraints');
    }

    await this.prisma.constraint.delete({
      where: { id: constraintId },
    });
  }

  /**
   * Toggles constraint active status (admin only)
   */
  async toggleConstraintStatus(
    constraintId: string,
    userId: string,
  ): Promise<Constraint> {
    const user = await this.prisma.user.findFirst({
      where: { userId },
      include: { admin: true },
    });

    if (!user?.admin) {
      throw new ForbiddenException('Only admins can toggle constraint status');
    }

    const constraint = await this.prisma.constraint.findUnique({
      where: { id: constraintId },
      include: { constraintType: true },
    });

    if (!constraint) {
      throw new NotFoundException('Constraint not found');
    }

    // Only admins can toggle constraints in their campus
    if (constraint.campusId !== user.admin.campusId) {
      throw new ForbiddenException(
        'You can only toggle constraints in your campus',
      );
    }

    return this.prisma.constraint.update({
      where: { id: constraintId },
      data: { isActive: !constraint.isActive },
      include: { constraintType: true },
    });
  }

  /**
   * Get all constraints for scheduling service serialization
   */
  async getConstraintsForScheduling(campusId: string): Promise<
    Array<{
      constraintId: string;
      constraintType: string;
      teacherId: string | null;
      value: Prisma.JsonValue;
      priority: number;
      category: string;
    }>
  > {
    const constraints = await this.prisma.constraint.findMany({
      where: {
        isActive: true,
        OR: [
          { campusId: campusId },
          { teacher: { department: { campusId: campusId } } },
        ],
      },
      include: {
        constraintType: true,
        teacher: {
          include: {
            user: true,
          },
        },
      },
    });

    // Transform constraints for scheduling service
    return constraints.map((constraint) => ({
      constraintId: constraint.id,
      constraintType: constraint.constraintType.name,
      teacherId: constraint.teacherId,
      value: constraint.value,
      priority: constraint.priority,
      category: constraint.constraintType.category,
    }));
  }
}
