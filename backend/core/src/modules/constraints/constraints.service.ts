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
  TimeslotConstraintValue,
  RoomConstraintValue,
  TeacherCompactnessConstraintValue,
  WorkloadDistributionConstraintValue,
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

  private _mapToResponse(
    constraint: Constraint & { constraintType: ConstraintType },
  ) {
    // Find the constraint definition key by matching the constraint type name
    const constraintTypeKey = Object.entries(CONSTRAINT_DEFINITIONS).find(
      ([_, definition]) => definition.name === constraint.constraintType.name,
    )?.[0] as ConstraintDefinitionKey | undefined;

    return {
      id: constraint.id,
      constraintTypeId: constraint.constraintTypeId,
      value: constraint.value,
      weight: constraint.priority, // Map priority to weight for DTO compatibility
      isActive: constraint.isActive,
      campusId: constraint.campusId,
      teacherId: constraint.teacherId,
      constraintType: {
        id: constraint.constraintType.id,
        name: constraint.constraintType.name,
        constraintTypeKey: constraintTypeKey,
        description: constraint.constraintType.description,
        category: constraint.constraintType.category,
        valueType: constraint.constraintType.valueType,
      },
    };
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
   * Creates a new constraint for a user
   */
  async createConstraint(
    userId: string,
    createDto: CreateConstraintDto,
  ): Promise<Constraint> {
    const user = await this.prisma.user.findFirst({
      where: { userId },
      include: {
        teacher: true,
        admin: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    } else if (user.role === Role.STUDENT) {
      throw new BadRequestException('Students cannot create constraints');
    }

    return await this._setConstraint(
      createDto.constraintTypeKey,
      createDto.value,
      user.admin?.campusId,
      user.teacher?.teacherId,
      createDto.priority,
    );
  }

  /**
   * Returns all constraints for a user
   */
  async getAllConstraints(userId: string) {
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

    const constraints = await this.prisma.constraint.findMany({
      where: whereClause,
      include: {
        constraintType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return constraints.map((constraint) => this._mapToResponse(constraint));
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

    // For teacher constraints, redirect to create (there'll only be one of each type)
    if (user.teacher && constraint.teacherId === user.teacher.teacherId) {
      // Find the constraint definition key for this constraint type
      const constraintDefKey = Object.entries(CONSTRAINT_DEFINITIONS).find(
        ([_, def]) => def.name === constraint.constraintType.name,
      )?.[0] as ConstraintDefinitionKey;

      if (!constraintDefKey) {
        throw new BadRequestException(
          `Constraint type ${constraint.constraintType.name} not found in definitions`,
        );
      }

      // Use the new set-based system for teacher constraints
      if (updateDto.value) {
        return await this._setConstraint(
          constraintDefKey,
          updateDto.value,
          undefined, // campusId not needed for teacher constraints
          user.teacher.teacherId,
          updateDto.priority,
        );
      } else {
        // If no value provided, just update priority
        return this.prisma.constraint.update({
          where: { id: constraintId },
          data: {
            priority: updateDto.priority,
          },
          include: {
            constraintType: true,
          },
        });
      }
    }

    // For admin constraints, use the old update logic
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
      }
    }

    // Update the admin constraint
    return this.prisma.constraint.update({
      where: { id: constraintId },
      data: {
        value: validatedValue as unknown as Prisma.JsonObject,
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

  // Constraint setters for each constraint type.
  // There should be a more elegant way to do this but whatever.

  async _setConstraint(
    constraintTypeKey: ConstraintDefinitionKey,
    value: Record<string, unknown>,
    campusId?: string,
    teacherId?: string,
    priority?: number,
  ): Promise<Constraint> {
    const constraintDefinition = CONSTRAINT_DEFINITIONS[constraintTypeKey];
    if (!constraintDefinition) {
      throw new BadRequestException(
        `Constraint type ${constraintTypeKey} not found`,
      );
    }

    // Validate the constraint value against the schema
    const validatedValue = constraintDefinition.jsonSchema.parse(value);

    // Route to appropriate setter based on constraint type
    switch (constraintTypeKey) {
      case 'TEACHER_TIME_PREFERENCE':
        return this._setTimePreference(
          teacherId!,
          validatedValue as TimeslotConstraintValue,
          priority,
        );

      case 'TEACHER_ROOM_PREFERENCE':
        return this._setRoomPreference(
          teacherId!,
          validatedValue as RoomConstraintValue,
          priority,
        );

      case 'TEACHER_SCHEDULE_COMPACTNESS':
        return this._setScheduleCompactness(
          teacherId!,
          validatedValue as TeacherCompactnessConstraintValue,
          priority,
        );

      case 'TEACHER_WORKLOAD_DISTRIBUTION':
        return this._setWorkloadDistribution(
          teacherId!,
          validatedValue as WorkloadDistributionConstraintValue,
          priority,
        );

      default:
        throw new BadRequestException(
          `Constraint type ${constraintTypeKey} not implemented yet`,
        );
    }
  }

  /**
   * Sets time preference constraint for a teacher (prefer or avoid)
   * Overwrites existing constraint of the same preference type
   */
  private async _setTimePreference(
    teacherId: string,
    value: TimeslotConstraintValue,
    priority?: number,
  ): Promise<Constraint> {
    const constraintTypeId = this.constraintTypeMap.get(
      'TEACHER_TIME_PREFERENCE',
    );
    if (!constraintTypeId) {
      throw new BadRequestException(
        'Time preference constraint type not properly seeded',
      );
    }
    if (value.timeslotCodes.length === 0) {
      throw new BadRequestException(
        'No constraint created - empty timeslot list',
      );
    }

    const existingConstraints = await this.prisma.constraint.findMany({
      where: {
        teacherId: teacherId,
        constraintTypeId: constraintTypeId,
        isActive: true,
        value: {
          path: ['preference'],
          equals: value.preference,
        },
      },
    });

    const reverseConstraints = await this.prisma.constraint.findMany({
      where: {
        teacherId: teacherId,
        constraintTypeId: constraintTypeId,
        isActive: true,
        NOT: {
          value: {
            path: ['preference'],
            equals: value.preference,
          },
        },
      },
    });

    return await this.prisma.$transaction(async (tx) => {
      if (reverseConstraints.length > 0) {
        for (const reverseConstraint of reverseConstraints) {
          const constraintValue = reverseConstraint.value as {
            timeslotCodes?: string[];
            preference?: string;
          };

          if (
            constraintValue.timeslotCodes &&
            value.timeslotCodes.some((code) =>
              constraintValue.timeslotCodes!.includes(code),
            )
          ) {
            await tx.constraint.delete({
              where: { id: reverseConstraint.id },
            });
          }
        }
      }

      // Delete existing constraints of the same preference type
      if (existingConstraints.length > 0) {
        for (const existingConstraint of existingConstraints) {
          await tx.constraint.delete({
            where: { id: existingConstraint.id },
          });
        }
      }

      return tx.constraint.create({
        data: {
          constraintTypeId,
          teacherId,
          value: value as unknown as Prisma.JsonObject,
          priority: priority ?? 5.0,
        },
        include: {
          constraintType: true,
        },
      });
    });
  }

  /**
   * Sets room preference constraint for a teacher (prefer or avoid)
   * Handles conflicts with opposite preference type
   */
  private async _setRoomPreference(
    teacherId: string,
    value: RoomConstraintValue,
    priority?: number,
  ): Promise<Constraint> {
    const constraintTypeId = this.constraintTypeMap.get(
      'TEACHER_ROOM_PREFERENCE',
    );
    if (!constraintTypeId) {
      throw new BadRequestException(
        'Room preference constraint type not properly seeded',
      );
    }

    // Check if there are rooms to set
    const hasRooms =
      (value.roomIds && value.roomIds.length > 0) ??
      (value.buildingIds && value.buildingIds.length > 0);

    if (!hasRooms) {
      throw new BadRequestException('No constraint created - empty room list');
    }

    const existingConstraints = await this.prisma.constraint.findMany({
      where: {
        teacherId: teacherId,
        constraintTypeId: constraintTypeId,
        isActive: true,
        value: {
          path: ['preference'],
          equals: value.preference,
        },
      },
    });

    const reverseConstraints = await this.prisma.constraint.findMany({
      where: {
        teacherId: teacherId,
        constraintTypeId: constraintTypeId,
        isActive: true,
        NOT: {
          value: {
            path: ['preference'],
            equals: value.preference,
          },
        },
      },
    });

    return await this.prisma.$transaction(async (tx) => {
      if (reverseConstraints.length > 0) {
        for (const reverseConstraint of reverseConstraints) {
          const constraintValue = reverseConstraint.value as {
            roomIds?: string[];
            buildingIds?: string[];
            preference?: string;
          };

          // Check for room ID conflicts
          const hasRoomIdConflict =
            value.roomIds &&
            constraintValue.roomIds &&
            value.roomIds.some((roomId) =>
              constraintValue.roomIds!.includes(roomId),
            );

          // Check for building ID conflicts
          const hasBuildingIdConflict =
            value.buildingIds &&
            constraintValue.buildingIds &&
            value.buildingIds.some((buildingId) =>
              constraintValue.buildingIds!.includes(buildingId),
            );

          if (hasRoomIdConflict || hasBuildingIdConflict) {
            await tx.constraint.delete({
              where: { id: reverseConstraint.id },
            });
          }
        }
      }

      // Delete existing constraints of the same preference type
      if (existingConstraints.length > 0) {
        for (const existingConstraint of existingConstraints) {
          await tx.constraint.delete({
            where: { id: existingConstraint.id },
          });
        }
      }

      return tx.constraint.create({
        data: {
          constraintTypeId,
          teacherId,
          value: value as unknown as Prisma.JsonObject,
          priority: priority ?? 5.0,
        },
        include: {
          constraintType: true,
        },
      });
    });
  }

  /**
   * Sets schedule compactness constraint for a teacher
   * Overwrites existing constraint of this type
   */
  private async _setScheduleCompactness(
    teacherId: string,
    value: TeacherCompactnessConstraintValue,
    priority?: number,
  ): Promise<Constraint> {
    const constraintTypeId = this.constraintTypeMap.get(
      'TEACHER_SCHEDULE_COMPACTNESS',
    );
    if (!constraintTypeId) {
      throw new BadRequestException(
        'Schedule compactness constraint type not properly seeded',
      );
    }

    // Find existing constraint of this type
    const existingConstraint = await this.prisma.constraint.findFirst({
      where: {
        teacherId,
        constraintTypeId,
        isActive: true,
      },
    });

    // Delete existing constraint if found
    if (existingConstraint) {
      await this.prisma.constraint.delete({
        where: { id: existingConstraint.id },
      });
    }

    // Create new constraint (only if enabled)
    if (!value.enabled) {
      // If disabled, we just deleted the existing constraint and don't create a new one
      throw new BadRequestException(
        'No constraint created - compactness disabled',
      );
    }

    return this.prisma.constraint.create({
      data: {
        constraintTypeId,
        teacherId,
        value: value as unknown as Prisma.JsonObject,
        priority: priority ?? 5.0,
      },
      include: {
        constraintType: true,
      },
    });
  }

  /**
   * Sets workload distribution constraint for a teacher
   * Overwrites existing constraint of this type
   */
  private async _setWorkloadDistribution(
    teacherId: string,
    value: WorkloadDistributionConstraintValue,
    priority?: number,
  ): Promise<Constraint> {
    const constraintTypeId = this.constraintTypeMap.get(
      'TEACHER_WORKLOAD_DISTRIBUTION',
    );
    if (!constraintTypeId) {
      throw new BadRequestException(
        'Workload distribution constraint type not properly seeded',
      );
    }

    // Find existing constraint of this type
    const existingConstraint = await this.prisma.constraint.findFirst({
      where: {
        teacherId,
        constraintTypeId,
        isActive: true,
      },
    });

    // Delete existing constraint if found
    if (existingConstraint) {
      await this.prisma.constraint.delete({
        where: { id: existingConstraint.id },
      });
    }

    // Always create new constraint for workload distribution
    // (no "enabled" flag in this constraint type)
    return this.prisma.constraint.create({
      data: {
        constraintTypeId,
        teacherId,
        value: value as unknown as Prisma.JsonObject,
        priority: priority ?? 5.0,
      },
      include: {
        constraintType: true,
      },
    });
  }
}
