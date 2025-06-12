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
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dtos';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';

@Controller('departments')
@ApiBearerAuth()
@ApiTags('Departments')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser('sub') userId: string,
    @Body() createDepartmentDto: CreateDepartmentDto,
  ): Promise<ApiResponse<DepartmentResponseDto>> {
    const department = await this.departmentsService.createDepartment(
      userId,
      createDepartmentDto,
    );
    return ApiResponse.success(
      201,
      department,
      'Department created successfully',
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findAll(
    @GetUser('sub') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(10), ParseIntPipe) size: number,
  ): Promise<ApiResponse<DepartmentResponseDto[]>> {
    const departments =
      await this.departmentsService.findAllDepartments(userId, page, size);
    return ApiResponse.success(
      200,
      departments.data,
      'Departments fetched successfully',
      departments.pagination
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findOne(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<DepartmentResponseDto>> {
    const department = await this.departmentsService.findDepartmentById(
      userId,
      id,
    );
    return ApiResponse.success(
      200,
      department,
      'Department fetched successfully',
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<ApiResponse<DepartmentResponseDto>> {
    const department = await this.departmentsService.updateDepartment(
      userId,
      id,
      updateDepartmentDto,
    );
    return ApiResponse.success(
      200,
      department,
      'Department updated successfully',
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<void>> {
    await this.departmentsService.deleteDepartment(userId, id);
    return ApiResponse.success(
      200,
      undefined,
      'Department deleted successfully',
    );
  }
}
