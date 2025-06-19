import { Test, TestingModule } from '@nestjs/testing';
import { SchedulingService } from '../scheduling.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { TimeslotService } from '../../timeslots/timeslots.service';
import { ConstraintService } from '../../constraints/constraints.service';

describe('SchedulingService', () => {
  let service: SchedulingService;

  const mockPrismaService = {
    schedule: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    scheduledSession: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    campus: {
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('http://localhost:8000'),
  };

  const mockTimeslotService = {
    getAllTimeslots: jest.fn(),
    getTimeslotCodesForScheduling: jest.fn(),
  };

  const mockConstraintService = {
    getConstraintsForScheduling: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TimeslotService, useValue: mockTimeslotService },
        { provide: ConstraintService, useValue: mockConstraintService },
      ],
    }).compile();

    service = module.get<SchedulingService>(SchedulingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActiveSchedule', () => {
    it('should return active schedule when exists', async () => {
      const mockSchedule = {
        scheduleId: 'schedule-1',
        name: 'Active Schedule',
        active: true,
        createdAt: new Date(),
        campusId: 'campus-1',
      };

      mockPrismaService.campus.findFirst.mockResolvedValue({ campusId: 'campus-1' });
      mockPrismaService.schedule.findFirst.mockResolvedValue(mockSchedule);
      mockPrismaService.scheduledSession.findMany.mockResolvedValue([]);

      const result = await service.getActiveSchedule('user-1');

      expect(result).toBeDefined();
      expect(result.isActive).toBe(true);
    });

    it('should return null when no active schedule exists', async () => {
      mockPrismaService.campus.findFirst.mockResolvedValue({ campusId: 'campus-1' });
      mockPrismaService.schedule.findFirst.mockResolvedValue(null);

      const result = await service.getActiveSchedule('user-1');

      expect(result).toBeNull();
    });
  });

  describe('getAllSchedules', () => {
    it('should return all schedules for campus', async () => {
      const mockSchedules = [
        {
          scheduleId: 'schedule-1',
          name: 'Schedule 1',
          active: false,
          createdAt: new Date(),
          campusId: 'campus-1',
        },
        {
          scheduleId: 'schedule-2',
          name: 'Schedule 2',
          active: true,
          createdAt: new Date(),
          campusId: 'campus-1',
        },
      ];

      mockPrismaService.campus.findFirst.mockResolvedValue({ campusId: 'campus-1' });
      mockPrismaService.schedule.findMany.mockResolvedValue(mockSchedules);

      const result = await service.getAllSchedules('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].scheduleName).toBe('Schedule 1');
      expect(result[1].scheduleName).toBe('Schedule 2');
    });
  });
});
