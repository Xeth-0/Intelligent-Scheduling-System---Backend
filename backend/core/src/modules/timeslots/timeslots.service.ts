import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Timeslot } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

interface TimeslotSeedData {
  code: string;
  label: string;
  startTime: string;
  endTime: string;
  order: number;
}

@Injectable()
export class TimeslotService implements OnModuleInit {
  private readonly logger = new Logger(TimeslotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedTimeslots();
  }

  /**
   * Seeds the timeslot table with standardized university time periods
   */
  private async seedTimeslots(): Promise<void> {
    const existingTimeslots = await this.prisma.timeslot.count();

    if (existingTimeslots > 0) {
      this.logger.log('Timeslots already seeded, skipping...');
      return;
    }

    const timeslotData: TimeslotSeedData[] = [
      {
        code: '0800_0900',
        label: '08:00-09:00',
        startTime: '08:00',
        endTime: '09:00',
        order: 1,
      },
      {
        code: '0900_1000',
        label: '09:00-10:00',
        startTime: '09:00',
        endTime: '10:00',
        order: 2,
      },
      {
        code: '1000_1100',
        label: '10:00-11:00',
        startTime: '10:00',
        endTime: '11:00',
        order: 3,
      },
      {
        code: '1100_1200',
        label: '11:00-12:00',
        startTime: '11:00',
        endTime: '12:00',
        order: 4,
      },
      {
        code: '1200_1300',
        label: '12:00-13:00',
        startTime: '12:00',
        endTime: '13:00',
        order: 5,
      },
      {
        code: '1300_1400',
        label: '13:00-14:00',
        startTime: '13:00',
        endTime: '14:00',
        order: 6,
      },
      {
        code: '1400_1500',
        label: '14:00-15:00',
        startTime: '14:00',
        endTime: '15:00',
        order: 7,
      },
      {
        code: '1500_1600',
        label: '15:00-16:00',
        startTime: '15:00',
        endTime: '16:00',
        order: 8,
      },
      {
        code: '1600_1700',
        label: '16:00-17:00',
        startTime: '16:00',
        endTime: '17:00',
        order: 9,
      },
      {
        code: '1700_1800',
        label: '17:00-18:00',
        startTime: '17:00',
        endTime: '18:00',
        order: 10,
      },
    ];

    try {
      await this.prisma.timeslot.createMany({
        data: timeslotData,
        skipDuplicates: true,
      });

      this.logger.log(`Successfully seeded ${timeslotData.length} timeslots`);
    } catch (error) {
      this.logger.error('Failed to seed timeslots:', error);
      throw error;
    }
  }

  /**
   * Get all timeslots ordered by their sequence
   */
  async getAllTimeslots(): Promise<Timeslot[]> {
    return this.prisma.timeslot.findMany({
      orderBy: {
        order: 'asc',
      },
    });
  }

  /**
   * Get timeslot by code (e.g., "0900_1000")
   */
  async getTimeslotByCode(code: string): Promise<Timeslot | null> {
    return this.prisma.timeslot.findUnique({
      where: {
        code,
      },
    });
  }

  /**
   * Get timeslots by time range
   */
  async getTimeslotsByTimeRange(
    startTime: string,
    endTime: string,
  ): Promise<Timeslot[]> {
    return this.prisma.timeslot.findMany({
      where: {
        startTime: {
          gte: startTime,
        },
        endTime: {
          lte: endTime,
        },
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  /**
   * Get timeslot IDs for scheduling service serialization
   */
  async getTimeslotCodesForScheduling(): Promise<string[]> {
    const timeslots = await this.getAllTimeslots();
    return timeslots.map((slot) => slot.code);
  }

  /**
   * Find overlapping timeslots for conflict detection
   */
  async findOverlappingTimeslots(
    startTime: string,
    endTime: string,
  ): Promise<Timeslot[]> {
    return this.prisma.timeslot.findMany({
      where: {
        OR: [
          // Timeslot starts before our range ends and ends after our range starts
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gt: startTime } },
            ],
          },
        ],
      },
      orderBy: {
        order: 'asc',
      },
    });
  }
}
