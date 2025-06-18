import { Test, TestingModule } from '@nestjs/testing';
import { BuildingsService } from '../buildings.service';
import { PrismaService } from '@/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { Building } from '@prisma/client';

describe('BuildingsService', () => {
  let service: BuildingsService;
  let prismaService: PrismaService;

  const mockBuilding: Building = {
    buildingId: '1',
    name: 'Test Building',
    floor: 1,
  };

  const mockPrismaService = {
    building: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BuildingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<BuildingsService>(BuildingsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBuilding', () => {
    it('should create a building', async () => {
      const createDto = { name: 'Test Building', floor: 1 };
      mockPrismaService.building.create.mockResolvedValue(mockBuilding);

      const result = await service.createBuilding(createDto);

      expect(prismaService.building.create).toHaveBeenCalledWith({
        data: createDto,
      });
      expect(result).toEqual(mockBuilding);
    });
  });

  describe('findAllBuildings', () => {
    it('should return paginated buildings', async () => {
      const buildings = [mockBuilding];
      mockPrismaService.building.findMany.mockResolvedValue(buildings);
      mockPrismaService.building.count.mockResolvedValue(1);

      const result = await service.findAllBuildings(1, 10);

      expect(prismaService.building.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
        orderBy: [{ name: 'asc' }],
      });
      expect(result.data).toEqual(buildings);
      expect(result.pagination.totalItems).toBe(1);
    });
  });

  describe('findBuildingById', () => {
    it('should return a building', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(mockBuilding);

      const result = await service.findBuildingById('1');

      expect(prismaService.building.findUnique).toHaveBeenCalledWith({
        where: { buildingId: '1' },
      });
      expect(result).toEqual(mockBuilding);
    });

    it('should throw NotFoundException when building not found', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(null);

      await expect(service.findBuildingById('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBuilding', () => {
    it('should update a building', async () => {
      const updateDto = { name: 'Updated Building' };
      mockPrismaService.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrismaService.building.update.mockResolvedValue({
        ...mockBuilding,
        name: 'Updated Building',
      });

      const result = await service.updateBuilding('1', updateDto);

      expect(prismaService.building.update).toHaveBeenCalledWith({
        where: { buildingId: '1' },
        data: updateDto,
      });
      expect(result.name).toBe('Updated Building');
    });
  });

  describe('deleteBuilding', () => {
    it('should delete a building', async () => {
      mockPrismaService.building.findUnique.mockResolvedValue(mockBuilding);
      mockPrismaService.building.delete.mockResolvedValue(mockBuilding);

      await service.deleteBuilding('1');

      expect(prismaService.building.delete).toHaveBeenCalledWith({
        where: { buildingId: '1' },
      });
    });
  });
}); 