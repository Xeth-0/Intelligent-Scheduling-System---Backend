import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from '../file.service';
import { PrismaService } from '@/prisma/prisma.service';
import { TaskStatus } from '@prisma/client';
import { ClientProxy } from '@nestjs/microservices';

describe('FileService', () => {
  let service: FileService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    task: {
      create: jest.fn(),
    },
  };

  const mockClient = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: 'CSV_SERVICE', useValue: mockClient },
      ],
    }).compile();

    service = module.get<FileService>(FileService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('queueValidationTask', () => {
    it('should queue a validation task', async () => {
      const mockFile = {
        originalname: 'test.csv',
        buffer: Buffer.from('test,data\n1,value'),
      } as Express.Multer.File;

      const category = 'COURSE';
      const adminId = 'admin-1';
      const campusId = 'campus-1';

      const mockTask = {
        taskId: expect.any(String),
        adminId: 'admin-1',
        campusId: 'campus-1',
        fileName: 'test.csv',
        status: TaskStatus.QUEUED,
        errorCount: 0,
        description: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.queueValidationTask(mockFile, category, adminId, campusId);

      expect(prismaService.task.create).toHaveBeenCalledWith({
        data: {
          taskId: expect.any(String),
          adminId,
          campusId,
          fileName: 'test.csv',
          status: TaskStatus.QUEUED,
          errorCount: 0,
          description: undefined,
        },
      });
      expect(mockClient.emit).toHaveBeenCalledWith('csv_validation_request', {
        taskId: expect.any(String),
        fileData: expect.any(String),
        category,
        adminId,
        campusId,
      });
      expect(result).toEqual({
        message: 'File queued for validation',
        taskId: expect.any(String),
      });
    });
  });
}); 