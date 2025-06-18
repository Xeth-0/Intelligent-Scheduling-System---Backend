import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from '../courses.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { NotFoundException } from '@nestjs/common';
import { Course, SessionType } from '@prisma/client';

describe('CoursesService', () => {
  let service: CoursesService;
  let prismaService: PrismaService;
  let campusValidationService: CampusValidationService;

  const mockCourse: Course = {
    courseId: '1',
    name: 'Test Course',
    code: 'TC101',
    description: 'A test course',
    departmentId: 'dept-1',
    ectsCredits: 3,
    teacherId: 'teacher-1',
    sessionType: SessionType.LECTURE,
    sessionsPerWeek: 2,
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
        CoursesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CampusValidationService, useValue: mockCampusValidationService },
      ],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
    prismaService = module.get<PrismaService>(PrismaService);
    campusValidationService = module.get<CampusValidationService>(CampusValidationService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCourse', () => {
    it('should create a course', async () => {
      const userId = 'user-1';
      const createDto = {
        name: 'Test Course',
        code: 'TC101',
        departmentId: 'dept-1',
        ectsCredits: 3,
        sessionType: SessionType.LECTURE,
        sessionsPerWeek: 2,
      };

      mockPrismaService.department.findUnique.mockResolvedValue({ 
        deptId: 'dept-1', 
        campusId: 'campus-1' 
      });
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);
      mockPrismaService.course.create.mockResolvedValue({
        ...mockCourse,
        department: { name: 'Test Department', campusId: 'campus-1' }
      });

      const result = await service.createCourse(userId, createDto);

      expect(prismaService.course.create).toHaveBeenCalledWith({
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

  describe('findAllCourses', () => {
    it('should return all courses for user campus', async () => {
      const userId = 'user-1';
      const courses = [mockCourse];

      mockCampusValidationService.getCampusIdForUser.mockResolvedValue('campus-1');
      mockPrismaService.course.findMany.mockResolvedValue(courses);
      mockPrismaService.course.count.mockResolvedValue(1);

      const result = await service.findAllCourses(userId, 1, 10);

      expect(prismaService.course.findMany).toHaveBeenCalledWith({
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
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

  describe('findCourseById', () => {
    it('should return a course by id', async () => {
      const userId = 'user-1';
      const courseWithDept = {
        ...mockCourse,
        department: { name: 'Test Department', campusId: 'campus-1' }
      };

      mockPrismaService.course.findUnique.mockResolvedValue(courseWithDept);
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);

      const result = await service.findCourseById(userId, '1');

      expect(prismaService.course.findUnique).toHaveBeenCalledWith({
        where: { courseId: '1' },
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

    it('should throw NotFoundException when course not found', async () => {
      const userId = 'user-1';
      mockPrismaService.course.findUnique.mockResolvedValue(null);

      await expect(service.findCourseById(userId, '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCourse', () => {
    it('should update a course', async () => {
      const userId = 'user-1';
      const updateDto = { name: 'Updated Course' };
      const updatedCourse = { ...mockCourse, name: 'Updated Course' };

      // Mock findCourseById call
      jest.spyOn(service, 'findCourseById').mockResolvedValue({
        courseId: '1',
        name: 'Test Course',
        code: 'TC101',
        description: 'A test course',
        departmentId: 'dept-1',
        ectsCredits: 3,
        sessionType: SessionType.LECTURE,
        sessionsPerWeek: 2,
      });
      
      mockPrismaService.course.update.mockResolvedValue({
        ...updatedCourse,
        department: { name: 'Test Department', campusId: 'campus-1' }
      });

      const result = await service.updateCourse(userId, '1', updateDto);

      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { courseId: '1' },
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

  describe('deleteCourse', () => {
    it('should delete a course', async () => {
      const userId = 'user-1';
      
      // Mock findCourseById call
      jest.spyOn(service, 'findCourseById').mockResolvedValue({
        courseId: '1',
        name: 'Test Course',
        code: 'TC101',
        description: 'A test course',
        ectsCredits: 3,
        sessionType: SessionType.LECTURE,
        sessionsPerWeek: 2,
      });
      
      mockPrismaService.course.delete.mockResolvedValue(mockCourse);

      await service.deleteCourse(userId, '1');

      expect(prismaService.course.delete).toHaveBeenCalledWith({
        where: { courseId: '1' },
      });
    });
  });
}); 