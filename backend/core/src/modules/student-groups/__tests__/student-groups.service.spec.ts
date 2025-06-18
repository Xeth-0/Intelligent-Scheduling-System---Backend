import { Test, TestingModule } from '@nestjs/testing';
import { StudentGroupsService } from '../student-groups.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { NotFoundException } from '@nestjs/common';
import { StudentGroup } from '@prisma/client';

describe('StudentGroupsService', () => {
  let service: StudentGroupsService;
  let prismaService: PrismaService;
  let campusValidationService: CampusValidationService;

  const mockStudentGroup: StudentGroup = {
    studentGroupId: '1',
    name: 'CS 2024',
    size: 25,
    accessibilityRequirement: false,
    departmentId: 'dept-1',
  };

  const mockPrismaService = {
    studentGroup: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    department: {
      findUnique: jest.fn(),
    },
  };

  const mockCampusValidationService = {
    validateCampusAccess: jest.fn(),
    getCampusIdForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudentGroupsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CampusValidationService, useValue: mockCampusValidationService },
      ],
    }).compile();

    service = module.get<StudentGroupsService>(StudentGroupsService);
    prismaService = module.get<PrismaService>(PrismaService);
    campusValidationService = module.get<CampusValidationService>(CampusValidationService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createStudentGroup', () => {
    it('should create a student group', async () => {
      const userId = 'user-1';
      const createDto = {
        name: 'CS 2024',
        size: 25,
        accessibilityRequirement: false,
        departmentId: 'dept-1',
      };

      mockPrismaService.department.findUnique.mockResolvedValue({ 
        deptId: 'dept-1', 
        campusId: 'campus-1' 
      });
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);
      mockPrismaService.studentGroup.create.mockResolvedValue({
        ...mockStudentGroup,
        department: { name: 'Test Department', campusId: 'campus-1' }
      });

      const result = await service.createStudentGroup(userId, createDto);

      expect(prismaService.studentGroup.create).toHaveBeenCalledWith({
        data: createDto,
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe('findAllStudentGroups', () => {
    it('should return all student groups for user campus', async () => {
      const userId = 'user-1';
      const studentGroups = [mockStudentGroup];

      mockCampusValidationService.getCampusIdForUser.mockResolvedValue('campus-1');
      mockPrismaService.studentGroup.findMany.mockResolvedValue(studentGroups);
      mockPrismaService.studentGroup.count.mockResolvedValue(1);

      const result = await service.findAllStudentGroups(userId, 1, 10);

      expect(campusValidationService.getCampusIdForUser).toHaveBeenCalledWith(userId);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findStudentGroupById', () => {
    it('should return a student group by id', async () => {
      const userId = 'user-1';
      const groupWithDept = {
        ...mockStudentGroup,
        department: { name: 'Test Department', campusId: 'campus-1' }
      };

      mockPrismaService.studentGroup.findUnique.mockResolvedValue(groupWithDept);
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);

      const result = await service.findStudentGroupById(userId, '1');

      expect(prismaService.studentGroup.findUnique).toHaveBeenCalledWith({
        where: { studentGroupId: '1' },
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
            },
          },
        },
      });
      expect(campusValidationService.validateCampusAccess).toHaveBeenCalledWith(userId, 'campus-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when student group not found', async () => {
      const userId = 'user-1';
      mockPrismaService.studentGroup.findUnique.mockResolvedValue(null);

      await expect(service.findStudentGroupById(userId, '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStudentGroup', () => {
    it('should update a student group', async () => {
      const userId = 'user-1';
      const updateDto = { name: 'Updated Group' };
      const updatedGroup = { ...mockStudentGroup, name: 'Updated Group' };

      // Mock findStudentGroupById call
      jest.spyOn(service, 'findStudentGroupById').mockResolvedValue({
        studentGroupId: '1',
        name: 'CS 2024',
        size: 25,
        accessibilityRequirement: false,
        departmentId: 'dept-1',
        department: { name: 'Test Department', campusId: 'campus-1' },
      });
      mockPrismaService.studentGroup.update.mockResolvedValue({
        ...updatedGroup,
        department: { name: 'Test Department', campusId: 'campus-1' }
      });

      const result = await service.updateStudentGroup(userId, '1', updateDto);

      expect(prismaService.studentGroup.update).toHaveBeenCalledWith({
        where: { studentGroupId: '1' },
        data: updateDto,
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe('deleteStudentGroup', () => {
    it('should delete a student group', async () => {
      const userId = 'user-1';
      
      // Mock findStudentGroupById call
      jest.spyOn(service, 'findStudentGroupById').mockResolvedValue({
        studentGroupId: '1',
        name: 'CS 2024',
        size: 25,
        accessibilityRequirement: false,
        departmentId: 'dept-1',
        department: { name: 'Test Department', campusId: 'campus-1' },
      });
      mockPrismaService.studentGroup.delete.mockResolvedValue(mockStudentGroup);

      await service.deleteStudentGroup(userId, '1');

      expect(prismaService.studentGroup.delete).toHaveBeenCalledWith({
        where: { studentGroupId: '1' },
      });
    });
  });
}); 