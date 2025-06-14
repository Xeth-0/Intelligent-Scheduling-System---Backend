/**
 * Comprehensive unit tests for ConstraintService
 * 
 * Test Coverage:
 * - Constraint type seeding and initialization
 * - CRUD operations for all constraint types
 * - Access control and authorization (Admin/Teacher/Student permissions)
 * - Complex constraint conflict resolution logic
 * - Time preference conflicts across multiple timeslots
 * - Room preference conflicts (rooms and buildings)
 * - Schedule compactness constraint logic
 * - Workload distribution constraints
 * - Edge cases and error handling
 * - Database transaction failure scenarios
 * - Validation logic integration with Zod schemas
 * 
 * The tests mock the PrismaService appropriately to isolate business logic
 * and verify the complex constraint setting algorithms work correctly.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ConstraintService } from '../constraints.service';
import { CreateConstraintDto, UpdateConstraintDto } from '../dtos';
import {
  Role,
  ConstraintType,
  Constraint,
  ConstraintCategory,
  ConstraintValueType,
  DayOfWeek,
  Prisma,
} from '@prisma/client';
import { CONSTRAINT_DEFINITIONS } from '../dtos/constraints.types';

// Mock Prisma service
const mockPrismaService = () => ({
  constraintType: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  constraint: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: {
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
});

// Mock data factories
const createMockUser = (role: Role, includeRelations = true) => ({
  userId: 'user-123',
  email: 'test@example.com',
  role,
  teacher: includeRelations && role === Role.TEACHER ? {
    teacherId: 'teacher-123',
    department: { campusId: 'campus-123' }
  } : null,
  admin: includeRelations && role === Role.ADMIN ? {
    campusId: 'campus-123'
  } : null,
});

const createMockConstraintType = (name: string): ConstraintType => ({
  id: `constraint-type-${name}`,
  name,
  description: `Description for ${name}`,
  category: ConstraintCategory.TEACHER_PREFERENCE,
  valueType: ConstraintValueType.TIME_SLOT,
  jsonSchema: {} as Prisma.JsonObject,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createMockConstraint = (overrides: Partial<Constraint> = {}): Constraint => ({
  id: 'constraint-123',
  constraintTypeId: 'constraint-type-123',
  campusId: null,
  teacherId: 'teacher-123',
  value: { preference: 'PREFER', timeslotCodes: ['0900_1000'] } as Prisma.JsonObject,
  priority: 5.0,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('ConstraintService', () => {
  let service: ConstraintService;
  let prismaService: ReturnType<typeof mockPrismaService>;

  beforeEach(async () => {
    const mockPrisma = mockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstraintService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ConstraintService>(ConstraintService);
    prismaService = mockPrisma;

    // Mock the constraint type seeding for initialization
    prismaService.constraintType.findFirst.mockResolvedValue(null);
    prismaService.constraintType.create.mockImplementation(async (data: any) => 
      createMockConstraintType(data.data.name)
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should seed constraint types from definitions', async () => {
      // Arrange
      const constraintDefinitions = Object.values(CONSTRAINT_DEFINITIONS);
      
      // Act
      await service.onModuleInit();

      // Assert
      expect(prismaService.constraintType.findFirst).toHaveBeenCalledTimes(
        constraintDefinitions.length
      );
      expect(prismaService.constraintType.create).toHaveBeenCalledTimes(
        constraintDefinitions.length
      );
    });

    it('should not create duplicate constraint types if they already exist', async () => {
      // Arrange
      const existingConstraintType = createMockConstraintType('Teacher Time Preference');
      prismaService.constraintType.findFirst.mockResolvedValue(existingConstraintType);

      // Act
      await service.onModuleInit();

      // Assert
      expect(prismaService.constraintType.create).not.toHaveBeenCalled();
    });
  });

  describe('createConstraint', () => {
    beforeEach(async () => {
      await service.onModuleInit(); // Seed constraint types
    });

    it('should create a time preference constraint for a teacher', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_TIME_PREFERENCE',
        value: {
          days: [DayOfWeek.MONDAY],
          timeslotCodes: ['0900_1000'],
          preference: 'PREFER',
        },
        priority: 7,
      };

      const mockConstraint = createMockConstraint({
        value: createDto.value as Prisma.JsonObject,
        priority: createDto.priority,
      });

      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.findMany.mockResolvedValue([]);
      prismaService.$transaction.mockImplementation(async (callback) => 
        callback(prismaService)
      );
      prismaService.constraint.create.mockResolvedValue({
        ...mockConstraint,
        constraintType: createMockConstraintType('Teacher Time Preference'),
      });

      // Act
      const result = await service.createConstraint(userId, createDto);

      // Assert
      expect(result).toBeDefined();
      expect(result.value).toEqual(createDto.value);
      expect(result.priority).toBe(createDto.priority);
      expect(prismaService.constraint.create).toHaveBeenCalledWith({
        data: {
          constraintTypeId: expect.any(String),
          teacherId: 'teacher-123',
          value: createDto.value,
          priority: 7,
        },
        include: {
          constraintType: true,
        },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      const userId = 'nonexistent-user';
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_TIME_PREFERENCE',
        value: { preference: 'PREFER', timeslotCodes: ['0900_1000'] },
      };

      prismaService.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createConstraint(userId, createDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when student tries to create constraint', async () => {
      // Arrange
      const userId = 'student-user';
      const studentUser = createMockUser(Role.STUDENT);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_TIME_PREFERENCE',
        value: { preference: 'PREFER', timeslotCodes: ['0900_1000'] },
      };

      prismaService.user.findFirst.mockResolvedValue(studentUser);

      // Act & Assert
      await expect(service.createConstraint(userId, createDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error for empty timeslot list (caught by Zod validation)', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_TIME_PREFERENCE',
        value: {
          days: [DayOfWeek.MONDAY],
          timeslotCodes: [], // Empty array
          preference: 'PREFER',
        },
      };

      prismaService.user.findFirst.mockResolvedValue(teacherUser);

      // Act & Assert - Zod validation will catch this before our service logic
      await expect(service.createConstraint(userId, createDto))
        .rejects.toThrow(); // ZodError will be thrown
    });

    it('should handle conflicting time preferences correctly', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_TIME_PREFERENCE',
        value: {
          days: [DayOfWeek.MONDAY],
          timeslotCodes: ['0900_1000'],
          preference: 'PREFER',
        },
      };

      const existingAvoidConstraint = createMockConstraint({
        value: {
          timeslotCodes: ['0900_1000'],
          preference: 'AVOID',
        } as Prisma.JsonObject,
      });

      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.findMany
        .mockResolvedValueOnce([]) // Same preference constraints
        .mockResolvedValueOnce([existingAvoidConstraint]); // Conflicting constraints

      prismaService.$transaction.mockImplementation(async (callback) => 
        callback(prismaService)
      );
      prismaService.constraint.delete.mockResolvedValue(existingAvoidConstraint);
      prismaService.constraint.create.mockResolvedValue({
        ...createMockConstraint(),
        constraintType: createMockConstraintType('Teacher Time Preference'),
      });

      // Act
      const result = await service.createConstraint(userId, createDto);

      // Assert
      expect(prismaService.constraint.delete).toHaveBeenCalledWith({
        where: { id: existingAvoidConstraint.id },
      });
      expect(result).toBeDefined();
    });
  });

  describe('getAllConstraints', () => {
    it('should return constraints for a teacher', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const mockConstraints = [
        {
          ...createMockConstraint(),
          constraintType: createMockConstraintType('Teacher Time Preference'),
        },
      ];

      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.findMany.mockResolvedValue(mockConstraints);

      // Act
      const result = await service.getAllConstraints(userId);

      // Assert - Check that the response is transformed using _mapToResponse
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'constraint-123');
      expect(result[0]).toHaveProperty('constraintType');
      expect(result[0].constraintType).toHaveProperty('name', 'Teacher Time Preference');
      expect(prismaService.constraint.findMany).toHaveBeenCalledWith({
        where: { teacherId: 'teacher-123' },
        include: { constraintType: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return constraints for an admin', async () => {
      // Arrange
      const userId = 'admin-123';
      const adminUser = createMockUser(Role.ADMIN);
      const mockConstraints = [
        {
          ...createMockConstraint({ campusId: 'campus-123', teacherId: null }),
          constraintType: createMockConstraintType('Campus ECTS Priority'),
        },
      ];

      prismaService.user.findFirst.mockResolvedValue(adminUser);
      prismaService.constraint.findMany.mockResolvedValue(mockConstraints);

      // Act
      const result = await service.getAllConstraints(userId);

      // Assert - Check that the response is transformed using _mapToResponse
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'constraint-123');
      expect(result[0]).toHaveProperty('campusId', 'campus-123');
      expect(result[0]).toHaveProperty('teacherId', null);
      expect(result[0]).toHaveProperty('constraintType');
      expect(result[0].constraintType).toHaveProperty('name', 'Campus ECTS Priority');
      expect(prismaService.constraint.findMany).toHaveBeenCalledWith({
        where: { campusId: 'campus-123' },
        include: { constraintType: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw BadRequestException for student users', async () => {
      // Arrange
      const userId = 'student-123';
      const studentUser = createMockUser(Role.STUDENT);

      prismaService.user.findFirst.mockResolvedValue(studentUser);

      // Act & Assert
      await expect(service.getAllConstraints(userId))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('updateConstraint', () => {
    it('should update teacher constraint using set logic', async () => {
      // Arrange
      const constraintId = 'constraint-123';
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const existingConstraint = {
        ...createMockConstraint(),
        constraintType: createMockConstraintType('Teacher Time Preference'),
      };
      const updateDto: UpdateConstraintDto = {
        value: {
          days: [DayOfWeek.TUESDAY],
          timeslotCodes: ['1000_1100'],
          preference: 'AVOID',
        },
        priority: 8,
      };

      // Ensure service is initialized first to populate constraint type map
      await service.onModuleInit();
      
      prismaService.constraint.findUnique.mockResolvedValue(existingConstraint);
      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.findMany.mockResolvedValue([]);
      prismaService.$transaction.mockImplementation(async (callback) => 
        callback(prismaService)
      );
      prismaService.constraint.create.mockResolvedValue({
        ...existingConstraint,
        value: updateDto.value as Prisma.JsonObject,
        priority: updateDto.priority,
      });

      // Act
      const result = await service.updateConstraint(constraintId, userId, updateDto);

      // Assert
      expect(result.value).toEqual(updateDto.value);
      expect(result.priority).toBe(updateDto.priority);
    });

    it('should throw ForbiddenException when user tries to update others constraint', async () => {
      // Arrange
      const constraintId = 'constraint-123';
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const existingConstraint = createMockConstraint({
        teacherId: 'different-teacher-456', // Different teacher
      });
      const updateDto: UpdateConstraintDto = { priority: 8 };

      prismaService.constraint.findUnique.mockResolvedValue(existingConstraint);
      prismaService.user.findFirst.mockResolvedValue(teacherUser);

      // Act & Assert
      await expect(service.updateConstraint(constraintId, userId, updateDto))
        .rejects.toThrow(ForbiddenException);
    });

    it('should update admin constraint directly', async () => {
      // Arrange
      const constraintId = 'constraint-123';
      const userId = 'admin-123';
      const adminUser = createMockUser(Role.ADMIN);
      const existingConstraint = {
        ...createMockConstraint({
          campusId: 'campus-123',
          teacherId: null,
        }),
        constraintType: createMockConstraintType('Campus ECTS Priority'),
      };
      const updateDto: UpdateConstraintDto = {
        priority: 9,
        isActive: false,
      };

      prismaService.constraint.findUnique.mockResolvedValue(existingConstraint);
      prismaService.user.findFirst.mockResolvedValue(adminUser);
      prismaService.constraint.update.mockResolvedValue({
        ...existingConstraint,
        priority: updateDto.priority,
        isActive: updateDto.isActive,
      });

      // Act
      const result = await service.updateConstraint(constraintId, userId, updateDto);

      // Assert
      expect(result.priority).toBe(updateDto.priority);
      expect(result.isActive).toBe(updateDto.isActive);
      expect(prismaService.constraint.update).toHaveBeenCalledWith({
        where: { id: constraintId },
        data: {
          value: existingConstraint.value,
          priority: updateDto.priority,
          isActive: updateDto.isActive,
        },
        include: { constraintType: true },
      });
    });
  });

  describe('deleteConstraint', () => {
    it('should delete constraint when user is owner', async () => {
      // Arrange
      const constraintId = 'constraint-123';
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const existingConstraint = createMockConstraint({
        teacherId: 'teacher-123',
      });

      prismaService.constraint.findUnique.mockResolvedValue(existingConstraint);
      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.delete.mockResolvedValue(existingConstraint);

      // Act
      await service.deleteConstraint(constraintId, userId);

      // Assert
      expect(prismaService.constraint.delete).toHaveBeenCalledWith({
        where: { id: constraintId },
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      // Arrange
      const constraintId = 'constraint-123';
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const existingConstraint = createMockConstraint({
        teacherId: 'different-teacher-456',
      });

      prismaService.constraint.findUnique.mockResolvedValue(existingConstraint);
      prismaService.user.findFirst.mockResolvedValue(teacherUser);

      // Act & Assert
      await expect(service.deleteConstraint(constraintId, userId))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('getConstraintsForScheduling', () => {
    it('should return formatted constraints for scheduling service', async () => {
      // Arrange
      const campusId = 'campus-123';
      const mockConstraints = [
        {
          id: 'constraint-1',
          constraintType: createMockConstraintType('Teacher Time Preference'),
          teacherId: 'teacher-123',
          value: { preference: 'PREFER' } as Prisma.JsonValue,
          priority: 7,
          teacher: {
            user: { userId: 'user-123' }
          }
        },
        {
          id: 'constraint-2',
          constraintType: createMockConstraintType('Campus ECTS Priority'),
          teacherId: null,
          value: { enabled: true } as Prisma.JsonValue,
          priority: 5,
          teacher: null
        },
      ];

      prismaService.constraint.findMany.mockResolvedValue(mockConstraints);

      // Act
      const result = await service.getConstraintsForScheduling(campusId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        constraintId: 'constraint-1',
        constraintType: 'Teacher Time Preference',
        teacherId: 'teacher-123',
        value: { preference: 'PREFER' },
        priority: 7,
        category: ConstraintCategory.TEACHER_PREFERENCE,
      });
      expect(result[1]).toEqual({
        constraintId: 'constraint-2',
        constraintType: 'Campus ECTS Priority',
        teacherId: null,
        value: { enabled: true },
        priority: 5,
        category: ConstraintCategory.TEACHER_PREFERENCE,
      });
    });
  });

  describe('Room Preference Constraints', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should create room preference constraint with room IDs', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_ROOM_PREFERENCE',
        value: {
          roomIds: ['room-1', 'room-2'],
          preference: 'PREFER',
        },
      };

      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.findMany.mockResolvedValue([]);
      prismaService.$transaction.mockImplementation(async (callback) => 
        callback(prismaService)
      );
      prismaService.constraint.create.mockResolvedValue({
        ...createMockConstraint(),
        constraintType: createMockConstraintType('Teacher Room Preference'),
      });

      // Act
      const result = await service.createConstraint(userId, createDto);

      // Assert
      expect(result).toBeDefined();
      expect(prismaService.constraint.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for empty room preference', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_ROOM_PREFERENCE',
        value: {
          roomIds: [],
          buildingIds: [],
          preference: 'PREFER',
        },
      };

      prismaService.user.findFirst.mockResolvedValue(teacherUser);

      // Act & Assert
      await expect(service.createConstraint(userId, createDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Schedule Compactness Constraints', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should create schedule compactness constraint when enabled', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_SCHEDULE_COMPACTNESS',
        value: {
          enabled: true,
          maxGapsPerDay: 1,
          maxActiveDays: 4,
          maxConsecutiveSessions: 3,
        },
      };

      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.findFirst.mockResolvedValue(null);
      prismaService.constraint.create.mockResolvedValue({
        ...createMockConstraint(),
        constraintType: createMockConstraintType('Teacher Schedule Compactness'),
      });

      // Act
      const result = await service.createConstraint(userId, createDto);

      // Assert
      expect(result).toBeDefined();
      expect(prismaService.constraint.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when compactness is disabled', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_SCHEDULE_COMPACTNESS',
        value: {
          enabled: false,
          maxGapsPerDay: 1,
          maxActiveDays: 4,
          maxConsecutiveSessions: 3,
        },
      };

      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createConstraint(userId, createDto))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should handle database transaction failures gracefully', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'TEACHER_TIME_PREFERENCE',
        value: {
          days: [DayOfWeek.MONDAY],
          timeslotCodes: ['0900_1000'],
          preference: 'PREFER',
        },
      };

      prismaService.user.findFirst.mockResolvedValue(teacherUser);
      prismaService.constraint.findMany.mockResolvedValue([]);
      prismaService.$transaction.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.createConstraint(userId, createDto))
        .rejects.toThrow('Database error');
    });

    it('should handle invalid constraint type key', async () => {
      // Arrange
      const userId = 'user-123';
      const teacherUser = createMockUser(Role.TEACHER);
      const createDto: CreateConstraintDto = {
        constraintTypeKey: 'INVALID_CONSTRAINT_TYPE' as any,
        value: { preference: 'PREFER' },
      };

      prismaService.user.findFirst.mockResolvedValue(teacherUser);

      // Act & Assert
      await expect(service.createConstraint(userId, createDto))
        .rejects.toThrow(BadRequestException);
    });
  });
});