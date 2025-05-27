import {
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { BuildingsService } from './buildings.service';
import {
  CreateBuildingDto,
  UpdateBuildingDto,
  BuildingResponseDto,
} from './dtos';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';

@Controller('buildings')
@ApiBearerAuth()
@ApiTags('Buildings')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createBuildingDto: CreateBuildingDto,
  ): Promise<ApiResponse<BuildingResponseDto>> {
    const building =
      await this.buildingsService.createBuilding(createBuildingDto);
    return ApiResponse.success(201, building, 'Building created successfully');
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findAll(): Promise<ApiResponse<BuildingResponseDto[]>> {
    const buildings = await this.buildingsService.findAllBuildings();
    return ApiResponse.success(
      200,
      buildings,
      'Buildings fetched successfully',
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<BuildingResponseDto>> {
    const building = await this.buildingsService.findBuildingById(id);
    return ApiResponse.success(200, building, 'Building fetched successfully');
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
  ): Promise<ApiResponse<BuildingResponseDto>> {
    const building = await this.buildingsService.updateBuilding(
      id,
      updateBuildingDto,
    );
    return ApiResponse.success(200, building, 'Building updated successfully');
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(@Param('id') id: string): Promise<ApiResponse<void>> {
    await this.buildingsService.deleteBuilding(id);
    return ApiResponse.success(200, undefined, 'Building deleted successfully');
  }
}
