import { Test, TestingModule } from '@nestjs/testing';
import { ConstraintService } from '../constraints.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('ConstraintService', () => {
  let service: ConstraintService;
  let prismaService: PrismaService;

  const mockUser = {
    userId: 'user-1',
    email: 'test@example.com',
    role: Role.TEACHER,
    teacher: {
      teacherId: 'teacher-1',
      department: { campusId: 'campus-1' },
    },
  };

  const mockConstraintType = {
    id: 'type-1',
    name: 'Time Preference',
    description: 'Teacher time preference',
    category: 'TEACHER_PREFERENCE',
    valueType: 'TIME_SLOT',
    jsonSchema: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConstraint = {
    id: 'constraint-1',
    constraintTypeId: 'type-1',
    teacherId: 'teacher-1',
    campusId: null,
    value: { preference: 'PREFER' },
    priority: 5,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    constraintType: mockConstraintType,
  };

  const mockPrismaService = {
    constraintType: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    constraint: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConstraintService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConstraintService>(ConstraintService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock constraint type seeding
    mockPrismaService.constraintType.findFirst.mockResolvedValue(null);
    mockPrismaService.constraintType.create.mockResolvedValue(mockConstraintType);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllConstraints', () => {
    it('should return all constraints for a user', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.constraint.findMany.mockResolvedValue([mockConstraint]);

      const result = await service.getAllConstraints('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('constraint-1');
    });

    it('should return empty array for user with no constraints', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.constraint.findMany.mockResolvedValue([]);

      const result = await service.getAllConstraints('user-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('getConstraintTypes', () => {
    it('should return all constraint types', async () => {
      mockPrismaService.constraintType.findMany.mockResolvedValue([mockConstraintType]);

      const result = await service.getConstraintTypes();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Time Preference');
    });
  });

  describe('deleteConstraint', () => {
    it('should delete a constraint successfully', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.constraint.findUnique.mockResolvedValue(mockConstraint);
      mockPrismaService.constraint.delete.mockResolvedValue(mockConstraint);

      await service.deleteConstraint('constraint-1', 'user-1');

      expect(mockPrismaService.constraint.delete).toHaveBeenCalledWith({
        where: { id: 'constraint-1' },
      });
    });

    it('should throw NotFoundException when constraint not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.constraint.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteConstraint('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleConstraintStatus', () => {
    it('should toggle constraint status', async () => {
      const updatedConstraint = { ...mockConstraint, isActive: false };
      
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.constraint.findUnique.mockResolvedValue(mockConstraint);
      mockPrismaService.constraint.update.mockResolvedValue(updatedConstraint);

      const result = await service.toggleConstraintStatus('constraint-1', 'user-1');

      expect(result.isActive).toBe(false);
      expect(mockPrismaService.constraint.update).toHaveBeenCalledWith({
        where: { id: 'constraint-1' },
        data: { isActive: false },
        include: { constraintType: true },
      });
    });
  });
}); 