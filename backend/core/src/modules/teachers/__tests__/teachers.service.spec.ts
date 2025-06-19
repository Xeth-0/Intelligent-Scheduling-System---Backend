import { Test, TestingModule } from '@nestjs/testing';
import { TeachersService } from '../teachers.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { NotFoundException } from '@nestjs/common';
import { Teacher } from '@prisma/client';

describe('TeachersService', () => {
  let service: TeachersService;
  let prismaService: PrismaService;
  let campusValidationService: CampusValidationService;

  const mockTeacher: Teacher = {
    teacherId: '1',
    userId: 'user-1',
    departmentId: 'dept-1',
  };

  const mockPrismaService = {
    teacher: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    admin: {
      findFirst: jest.fn(),
    },
    course: {
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockCampusValidationService = {
    validateCampusAccess: jest.fn(),
    getCampusIdForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeachersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CampusValidationService, useValue: mockCampusValidationService },
      ],
    }).compile();

    service = module.get<TeachersService>(TeachersService);
    prismaService = module.get<PrismaService>(PrismaService);
    campusValidationService = module.get<CampusValidationService>(CampusValidationService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllTeachers', () => {
    it('should return all teachers for user campus', async () => {
      const userId = 'user-1';
      const teachers = [mockTeacher];

      mockCampusValidationService.getCampusIdForUser.mockResolvedValue('campus-1');
      mockPrismaService.teacher.findMany.mockResolvedValue(teachers);
      mockPrismaService.teacher.count.mockResolvedValue(1);

      const result = await service.findAllTeachers(userId, 1, 10);

      expect(campusValidationService.getCampusIdForUser).toHaveBeenCalledWith(userId);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findTeacherById', () => {
    it('should return a teacher by id', async () => {
      const userId = 'user-1';
      const teacherWithDetails = {
        ...mockTeacher,
        user: { userId: 'user-1', firstName: 'John', lastName: 'Doe' },
        department: { deptId: 'dept-1', name: 'CS', campusId: 'campus-1' },
        courses: []
      };

      mockPrismaService.teacher.findUnique.mockResolvedValue(teacherWithDetails);
      mockCampusValidationService.validateCampusAccess.mockResolvedValue(undefined);

      const result = await service.findTeacherById(userId, '1');

      expect(prismaService.teacher.findUnique).toHaveBeenCalledWith({
        where: { teacherId: '1' },
        include: {
          user: true,
          department: true,
          courses: true,
        },
      });
      expect(campusValidationService.validateCampusAccess).toHaveBeenCalledWith(userId, 'campus-1');
      expect(result).toBeDefined();
    });

    it('should throw NotFoundException when teacher not found', async () => {
      const userId = 'user-1';
      mockPrismaService.teacher.findUnique.mockResolvedValue(null);

      await expect(service.findTeacherById(userId, '1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTeacher', () => {
    it('should update a teacher', async () => {
      const userId = 'user-1';
      const updateDto = { 
        teacherId: '1',
        departmentId: 'dept-2',
        courseId: 'course-1'
      };

      mockPrismaService.admin.findFirst.mockResolvedValue({ userId, campusId: 'campus-1' });
      mockPrismaService.teacher.findUnique.mockResolvedValue(mockTeacher);
      mockPrismaService.course.update.mockResolvedValue({});
      mockPrismaService.teacher.update.mockResolvedValue({
        ...mockTeacher,
        departmentId: 'dept-2',
        user: { userId: 'user-1', firstName: 'John', lastName: 'Doe' },
        department: { deptId: 'dept-2', name: 'Math', campusId: 'campus-1' },
        courses: []
      });

      const result = await service.updateTeacher(userId, updateDto);

      expect(prismaService.teacher.update).toHaveBeenCalledWith({
        where: { teacherId: '1' },
        data: { departmentId: 'dept-2' },
        include: {
          user: true,
          department: true,
          courses: true,
        },
      });
      expect(result).toBeDefined();
    });
  });

  describe('deleteTeacher', () => {
    it('should delete a teacher', async () => {
      const userId = 'user-1';
      
      mockPrismaService.admin.findFirst.mockResolvedValue({ userId, campusId: 'campus-1' });
      mockPrismaService.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        department: { deptId: 'dept-1', campusId: 'campus-1' }
      });
      mockPrismaService.course.findMany.mockResolvedValue([
        { courseId: 'course-1', teacherId: '1' }
      ]);
      mockPrismaService.course.update.mockResolvedValue({});

      await service.deleteTeacher(userId, '1');

      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
        data: { teacherId: null },
      });
    });
  });

  describe('unassignTeacher', () => {
    it('should unassign teacher from courses', async () => {
      const userId = 'user-1';
      const unassignDto = {
        teacherId: '1',
        courseIds: ['course-1', 'course-2'],
      };

      const mockCourses = [
        { courseId: 'course-1', teacherId: '1' },
        { courseId: 'course-2', teacherId: '1' },
      ];

      mockPrismaService.admin.findFirst.mockResolvedValue({ userId, campusId: 'campus-1' });
      mockPrismaService.teacher.findUnique.mockResolvedValue({
        ...mockTeacher,
        department: { deptId: 'dept-1', campusId: 'campus-1' }
      });
      mockPrismaService.course.findMany.mockResolvedValue(mockCourses);
      mockPrismaService.course.update.mockResolvedValue({});

      await service.unassignTeacher(userId, unassignDto);

      expect(prismaService.course.update).toHaveBeenCalledTimes(2);
      expect(prismaService.course.update).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
        data: { teacherId: null },
      });
    });
  });
}); 