import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { NotFoundException } from '@nestjs/common';
import { SessionType } from '@prisma/client';

describe('CoursesService', () => {
  let service: CoursesService;
  let prismaService: PrismaService;

  const mockCourse = {
    courseId: '1',
    name: 'Test Course',
    code: 'TEST101',
    description: 'Test Description',
    ectsCredits: 3,
    sessionType: SessionType.LECTURE,
    sessionsPerWeek: 2,
    departmentId: 'dept-1',
    department: {
      name: 'Test Department',
      campusId: 'campus-1',
    },
  };

  const mockPrismaService = {
    course: {
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
    getCampusIdForUser: jest.fn(),
    validateCampusAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CampusValidationService, useValue: mockCampusValidationService },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findCourseById', () => {
    it('should return a course by id', async () => {
      mockCampusValidationService.getCampusIdForUser.mockResolvedValue('campus-1');
      mockPrismaService.course.findUnique.mockResolvedValue(mockCourse);

      const result = await service.findCourseById('user-1', '1');

      expect(result).toBeDefined();
      expect(result.courseId).toBe('1');
      expect(result.name).toBe('Test Course');
    });

    it('should throw NotFoundException when course not found', async () => {
      mockCampusValidationService.getCampusIdForUser.mockResolvedValue('campus-1');
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.findCourseById('user-1', '999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCourse', () => {
    it('should create a course successfully', async () => {
      const createDto = {
        name: 'New Course',
        code: 'NEW101',
        description: 'New Description',
        ectsCredits: 3,
        sessionType: SessionType.LECTURE,
        sessionsPerWeek: 2,
        departmentId: 'dept-1',
      };

      mockPrismaService.admin.findFirst.mockResolvedValue({ campusId: 'campus-1' });
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);
      mockPrismaService.course.create.mockResolvedValue(mockCourse);

      const result = await service.createCourse('user-1', createDto);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Course');
    });
  });

  describe('findAllCourses', () => {
    it('should return paginated courses', async () => {
      mockCampusValidationService.getCampusIdForUser.mockResolvedValue('campus-1');
      mockPrismaService.course.findMany.mockResolvedValue([mockCourse]);
      mockPrismaService.course.count.mockResolvedValue(1);

      const result = await service.findAllCourses('user-1', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.totalItems).toBe(1);
    });
  });
}); 