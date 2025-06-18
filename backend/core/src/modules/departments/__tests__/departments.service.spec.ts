import { Test, TestingModule } from '@nestjs/testing';
import { DepartmentsService } from '../departments.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { NotFoundException } from '@nestjs/common';
import { Department } from '@prisma/client';

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let prismaService: PrismaService;
  let campusValidationService: CampusValidationService;

  const mockDepartment: Department = {
    deptId: '1',
    name: 'Computer Science',
    campusId: 'campus-1',
  };

  const mockPrismaService = {
    department: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    admin: {
      findFirst: jest.fn(),
    },
  };

  const mockCampusValidationService = {
    validateCampusAccess: jest.fn(),
    getCampusIdForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CampusValidationService, useValue: mockCampusValidationService },
      ],
    }).compile();

    service = module.get<DepartmentsService>(DepartmentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    campusValidationService = module.get<CampusValidationService>(CampusValidationService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDepartment', () => {
    it('should create a department', async () => {
      const userId = 'user-1';
      const createDto = {
        name: 'Computer Science',
      };

      mockPrismaService.admin.findFirst.mockResolvedValue({ userId, campusId: 'campus-1' });
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);
      mockPrismaService.department.create.mockResolvedValue({
        ...mockDepartment,
        campus: { name: 'Main Campus' }
      });

      const result = await service.createDepartment(userId, createDto);

      expect(prismaService.department.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          campusId: 'campus-1',
        },
        include: {
          campus: {
            select: {
              name: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe('findAllDepartments', () => {
    it('should return all departments for user campus', async () => {
      const userId = 'user-1';
      const departments = [{
        ...mockDepartment,
        campus: { name: 'Main Campus' }
      }];

      mockCampusValidationService.getCampusIdForUser.mockResolvedValue('campus-1');
      mockPrismaService.department.findMany.mockResolvedValue(departments);
      mockPrismaService.department.count.mockResolvedValue(1);

      const result = await service.findAllDepartments(userId, 1, 10);

      expect(campusValidationService.getCampusIdForUser).toHaveBeenCalledWith(userId);
      expect(prismaService.department.findMany).toHaveBeenCalledWith({
        where: { campusId: 'campus-1' },
        include: {
          campus: {
            select: {
              name: true,
            },
          },
        },
        skip: 0,
        take: 10,
        orderBy: [{ name: 'asc' }],
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findDepartmentById', () => {
    it('should return a department by id', async () => {
      const userId = 'user-1';
      const departmentWithCampus = {
        ...mockDepartment,
        campus: { name: 'Main Campus' }
      };

      mockPrismaService.department.findUnique.mockResolvedValue(departmentWithCampus);
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);

      const result = await service.findDepartmentById(userId, '1');

      expect(prismaService.department.findUnique).toHaveBeenCalledWith({
        where: { deptId: '1' },
        include: {
          campus: {
            select: {
              name: true,
            },
          },
        },
      });
      expect(campusValidationService.validateCampusAccess).toHaveBeenCalledWith(userId, 'campus-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when department not found', async () => {
      const userId = 'user-1';
      mockPrismaService.department.findUnique.mockResolvedValue(null);

      await expect(service.findDepartmentById(userId, '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateDepartment', () => {
    it('should update a department', async () => {
      const userId = 'user-1';
      const updateDto = { name: 'Updated Department' };
      const updatedDepartment = { 
        ...mockDepartment, 
        name: 'Updated Department',
        campus: { name: 'Main Campus' }
      };

      // Mock findDepartmentById call
      jest.spyOn(service, 'findDepartmentById').mockResolvedValue({
        deptId: '1',
        name: 'Computer Science',
        campusId: 'campus-1',
        campus: { name: 'Main Campus' },
      });
      mockPrismaService.department.update.mockResolvedValue(updatedDepartment);

      const result = await service.updateDepartment(userId, '1', updateDto);

      expect(prismaService.department.update).toHaveBeenCalledWith({
        where: { deptId: '1' },
        data: updateDto,
        include: {
          campus: {
            select: {
              name: true,
            },
          },
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe('deleteDepartment', () => {
    it('should delete a department', async () => {
      const userId = 'user-1';
      
      // Mock findDepartmentById call
      jest.spyOn(service, 'findDepartmentById').mockResolvedValue({
        deptId: '1',
        name: 'Computer Science',
        campusId: 'campus-1',
        campus: { name: 'Main Campus' },
      });
      mockPrismaService.department.delete.mockResolvedValue(mockDepartment);

      await service.deleteDepartment(userId, '1');

      expect(prismaService.department.delete).toHaveBeenCalledWith({
        where: { deptId: '1' },
      });
    });
  });
}); 