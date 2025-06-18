import { Test, TestingModule } from '@nestjs/testing';
import { TimeslotService } from '../timeslots.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Timeslot } from '@prisma/client';

describe('TimeslotService', () => {
  let service: TimeslotService;
  let prismaService: PrismaService;

  const mockTimeslot: Timeslot = {
    timeslotId: '1',
    code: '0900_1000',
    label: '09:00-10:00',
    startTime: '09:00',
    endTime: '10:00',
    order: 1,
  };

  const mockPrismaService = {
    timeslot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimeslotService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TimeslotService>(TimeslotService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllTimeslots', () => {
    it('should return all timeslots', async () => {
      const timeslots = [mockTimeslot];
      mockPrismaService.timeslot.findMany.mockResolvedValue(timeslots);

      const result = await service.getAllTimeslots();

      expect(prismaService.timeslot.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
      });
      expect(result).toEqual(timeslots);
    });
  });

  describe('getTimeslotByCode', () => {
    it('should return a timeslot by code', async () => {
      mockPrismaService.timeslot.findUnique.mockResolvedValue(mockTimeslot);

      const result = await service.getTimeslotByCode('0900_1000');

      expect(prismaService.timeslot.findUnique).toHaveBeenCalledWith({
        where: { code: '0900_1000' },
      });
      expect(result).toEqual(mockTimeslot);
    });

    it('should return null when timeslot not found', async () => {
      mockPrismaService.timeslot.findUnique.mockResolvedValue(null);

      const result = await service.getTimeslotByCode('invalid');
      
      expect(result).toBeNull();
    });
  });

  describe('getTimeslotsByTimeRange', () => {
    it('should return timeslots within time range', async () => {
      const timeslots = [mockTimeslot];
      mockPrismaService.timeslot.findMany.mockResolvedValue(timeslots);

      const result = await service.getTimeslotsByTimeRange('08:00', '12:00');

      expect(prismaService.timeslot.findMany).toHaveBeenCalledWith({
        where: {
          startTime: { gte: '08:00' },
          endTime: { lte: '12:00' },
        },
        orderBy: { order: 'asc' },
      });
      expect(result).toEqual(timeslots);
    });
  });

  describe('getTimeslotCodesForScheduling', () => {
    it('should return timeslot codes for scheduling', async () => {
      const timeslots = [mockTimeslot];
      mockPrismaService.timeslot.findMany.mockResolvedValue(timeslots);

      const result = await service.getTimeslotCodesForScheduling();

      expect(prismaService.timeslot.findMany).toHaveBeenCalledWith({
        orderBy: { order: 'asc' },
      });
      expect(result).toEqual(['0900_1000']);
    });
  });
}); 