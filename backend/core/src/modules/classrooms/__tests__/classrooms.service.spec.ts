import { Test, TestingModule } from '@nestjs/testing';
import { ClassroomsService } from '../classrooms.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { Classroom, ClassroomType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

describe('ClassroomsService', () => {
  let service: ClassroomsService;
  let prismaService: PrismaService;
  let campusValidationService: CampusValidationService;

  const mockClassroom: Classroom = {
    classroomId: '1',
    name: 'Test Classroom',
    capacity: 30,
    type: ClassroomType.LECTURE,
    campusId: 'campus-1',
    buildingId: 'building-1',
    isWheelchairAccessible: false,
    openingTime: '08:00',
    closingTime: '18:00',
    floor: 1,
  };

  const mockPrismaService = {
    admin: {
      findFirst: jest.fn(),
    },
    building: {
      findUnique: jest.fn(),
    },
    classroom: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockCampusValidationService = {
    validateCampusAccess: jest.fn(),
    getCampusIdForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassroomsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CampusValidationService, useValue: mockCampusValidationService },
      ],
    }).compile();

    service = module.get<ClassroomsService>(ClassroomsService);
    prismaService = module.get<PrismaService>(PrismaService);
    campusValidationService = module.get<CampusValidationService>(CampusValidationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createClassroom', () => {
    it('should create a classroom', async () => {
      const userId = 'user-1';
      const createDto = {
        name: 'Test Classroom',
        capacity: 30,
        type: ClassroomType.LAB,
        buildingId: 'building-1',
        isWheelchairAccessible: false,
        openingTime: '08:00',
        closingTime: '18:00',
        floor: 1,
      };

      const mockAdmin = {
        adminId: 'admin-1',
        userId: 'user-1',
        campusId: 'campus-1',
      };

      mockPrismaService.admin.findFirst.mockResolvedValue(mockAdmin);
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);
      mockPrismaService.building.findUnique.mockResolvedValue({
        buildingId: 'building-1',
        name: 'Test Building',
        floor: 1,
      });
      mockPrismaService.classroom.create.mockResolvedValue(mockClassroom);

      const result = await service.createClassroom(userId, createDto);

      expect(prismaService.admin.findFirst).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(campusValidationService.validateCampusAccess).toHaveBeenCalledWith(userId, 'campus-1');
      expect(result).toBeDefined();
    });
  });

  describe('findAllClassrooms', () => {
    it('should return paginated classrooms', async () => {
      const userId = 'user-1';
      const classrooms = [mockClassroom];
      
      mockCampusValidationService.getCampusIdForUser.mockResolvedValue('campus-1');
      mockPrismaService.classroom.findMany.mockResolvedValue(classrooms);
      mockPrismaService.classroom.count.mockResolvedValue(1);

      const result = await service.findAllClassrooms(userId, 1, 10);

      expect(campusValidationService.getCampusIdForUser).toHaveBeenCalledWith(userId);
      expect(result.data).toBeDefined();
      expect(result.pagination.totalItems).toBe(1);
    });
  });

  describe('findClassroomById', () => {
    it('should return a classroom', async () => {
      const userId = 'user-1';
      const classroomId = '1';
      
      mockPrismaService.classroom.findUnique.mockResolvedValue(mockClassroom);

      const result = await service.findClassroomById(userId, classroomId);

      expect(prismaService.classroom.findUnique).toHaveBeenCalledWith({
        where: { classroomId },
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when classroom not found', async () => {
      const userId = 'user-1';
      const classroomId = '1';
      
      mockPrismaService.classroom.findUnique.mockResolvedValue(null);

      await expect(service.findClassroomById(userId, classroomId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateClassroom', () => {
    it('should update a classroom', async () => {
      const userId = 'user-1';
      const classroomId = '1';
      const updateDto = { name: 'Updated Classroom' };
      const updatedClassroom = { ...mockClassroom, name: 'Updated Classroom' };
      
      mockPrismaService.classroom.findUnique.mockResolvedValue(mockClassroom);
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);
      mockPrismaService.building.findUnique.mockResolvedValue({
        buildingId: 'building-1',
        name: 'Test Building',
        floor: 1,
      });
      mockPrismaService.classroom.update.mockResolvedValue(updatedClassroom);

      const result = await service.updateClassroom(userId, classroomId, updateDto);

      expect(prismaService.classroom.update).toHaveBeenCalledWith({
        where: { classroomId },
        data: updateDto,
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
    });
  });

  describe('deleteClassroom', () => {
    it('should delete a classroom', async () => {
      const userId = 'user-1';
      const classroomId = '1';
      
      mockPrismaService.classroom.findUnique.mockResolvedValue(mockClassroom);
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);
      mockPrismaService.classroom.delete.mockResolvedValue(mockClassroom);

      await service.deleteClassroom(userId, classroomId);

      expect(prismaService.classroom.delete).toHaveBeenCalledWith({
        where: { classroomId },
      });
    });
  });
}); 