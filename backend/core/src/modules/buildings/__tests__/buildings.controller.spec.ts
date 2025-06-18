import { Test, TestingModule } from '@nestjs/testing';
import { BuildingsController } from '../buildings.controller';
import { BuildingsService } from '../buildings.service';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { CreateBuildingDto, UpdateBuildingDto } from '../dtos';

describe('BuildingsController', () => {
  let controller: BuildingsController;
  let service: BuildingsService;

  const mockBuildingResponse = {
    buildingId: '1',
    name: 'Main Building',
    floor: 5,
  };

  const mockService = {
    createBuilding: jest.fn(),
    findAllBuildings: jest.fn(),
    findBuildingById: jest.fn(),
    updateBuilding: jest.fn(),
    deleteBuilding: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BuildingsController],
      providers: [
        { provide: BuildingsService, useValue: mockService },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<BuildingsController>(BuildingsController);
    service = module.get<BuildingsService>(BuildingsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a building', async () => {
      const createDto: CreateBuildingDto = { name: 'New Building', floor: 3 };
      mockService.createBuilding.mockResolvedValue(mockBuildingResponse);

      const result = await controller.create(createDto);

      expect(result.data).toEqual(mockBuildingResponse);
      expect(result.statusCode).toBe(201);
      expect(mockService.createBuilding).toHaveBeenCalledWith(createDto);
    });
  });

  describe('findAll', () => {
    it('should return all buildings', async () => {
      const mockPaginatedResponse = {
        data: [mockBuildingResponse],
        pagination: {
          totalItems: 1,
          currentPage: 1,
          totalPages: 1,
          itemsPerPage: 10,
        },
      };
      mockService.findAllBuildings.mockResolvedValue(mockPaginatedResponse);

      const result = await controller.findAll(1, 10);

      expect(result.data).toEqual([mockBuildingResponse]);
      expect(result.statusCode).toBe(200);
      expect(mockService.findAllBuildings).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('findOne', () => {
    it('should return a building by id', async () => {
      mockService.findBuildingById.mockResolvedValue(mockBuildingResponse);

      const result = await controller.findOne('1');

      expect(result.data).toEqual(mockBuildingResponse);
      expect(result.statusCode).toBe(200);
      expect(mockService.findBuildingById).toHaveBeenCalledWith('1');
    });
  });

  describe('update', () => {
    it('should update a building', async () => {
      const updateDto: UpdateBuildingDto = { name: 'Updated Building' };
      const updatedBuilding = { ...mockBuildingResponse, name: 'Updated Building' };
      mockService.updateBuilding.mockResolvedValue(updatedBuilding);

      const result = await controller.update('1', updateDto);

      expect(result.data).toEqual(updatedBuilding);
      expect(result.statusCode).toBe(200);
      expect(mockService.updateBuilding).toHaveBeenCalledWith('1', updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a building', async () => {
      mockService.deleteBuilding.mockResolvedValue(undefined);

      const result = await controller.remove('1');

      expect(result.statusCode).toBe(200);
      expect(mockService.deleteBuilding).toHaveBeenCalledWith('1');
    });
  });
}); 