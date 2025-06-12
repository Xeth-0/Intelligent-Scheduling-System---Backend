import {
  PaginatedResponse,
  PaginationData,
} from '@/common/response/api-response.dto';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, Building } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingResponseDto,
} from './dtos';

@Injectable()
export class BuildingsService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Maps a building entity to response DTO
   */
  private mapToResponse(building: Building): BuildingResponseDto {
    return {
      buildingId: building.buildingId,
      name: building.name,
      floor: building.floor,
    };
  }

  /**
   * Creates a new building
   */
  async createBuilding(
    createBuildingDto: CreateBuildingDto,
  ): Promise<BuildingResponseDto> {
    try {
      const building = await this.prismaService.building.create({
        data: createBuildingDto,
      });

      return this.mapToResponse(building);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Building name already exists');
        } else if (error.code === 'P2025') {
          throw new NotFoundException(
            error.meta?.cause || 'Related entity not found',
          );
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Finds all buildings
   */
  async findAllBuildings(
    page: number,
    size: number,
  ): Promise<PaginatedResponse<BuildingResponseDto>> {
    
    const skip = (page - 1) * size;
    const [items, totalItems] = await Promise.all([
      this.prismaService.building.findMany({
        skip: skip,
        take: size,
        orderBy: [{ name: 'asc' }],
      }),
      this.prismaService.building.count(),
    ]);

    const itemDtos = items.map((item) => this.mapToResponse(item));
    const totalPages = Math.ceil(totalItems / size);
    const paginationData: PaginationData = {
      totalItems: totalItems,
      currentPage: page,
      totalPages: totalPages,
      itemsPerPage: size,
    };

    return new PaginatedResponse<BuildingResponseDto>(itemDtos, paginationData);
  }

  /**
   * Finds a building by ID
   */
  async findBuildingById(buildingId: string): Promise<BuildingResponseDto> {
    const building = await this.prismaService.building.findUnique({
      where: { buildingId },
    });

    if (!building) {
      throw new NotFoundException('Building not found');
    }

    return this.mapToResponse(building);
  }

  /**
   * Updates a building
   */
  async updateBuilding(
    buildingId: string,
    updateBuildingDto: UpdateBuildingDto,
  ): Promise<BuildingResponseDto> {
    try {
      // First validate the building exists
      await this.findBuildingById(buildingId);

      const building = await this.prismaService.building.update({
        where: { buildingId },
        data: updateBuildingDto,
      });

      return this.mapToResponse(building);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Building name already exists');
        } else if (error.code === 'P2025') {
          throw new NotFoundException('Building not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Deletes a building
   */
  async deleteBuilding(buildingId: string): Promise<void> {
    try {
      // First validate the building exists
      await this.findBuildingById(buildingId);

      await this.prismaService.building.delete({
        where: { buildingId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Building not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
