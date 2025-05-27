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
import { ClassroomsService } from './classrooms.service';
import {
  CreateClassroomDto,
  UpdateClassroomDto,
  ClassroomResponseDto,
} from './dtos';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';

@Controller('classrooms')
@ApiBearerAuth()
@ApiTags('Classrooms')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser('sub') userId: string,
    @Body() createClassroomDto: CreateClassroomDto,
  ): Promise<ApiResponse<ClassroomResponseDto>> {
    const classroom = await this.classroomsService.createClassroom(
      userId,
      createClassroomDto,
    );
    return ApiResponse.success(
      201,
      classroom,
      'Classroom created successfully',
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findAll(
    @GetUser('sub') userId: string,
  ): Promise<ApiResponse<ClassroomResponseDto[]>> {
    const classrooms = await this.classroomsService.findAllClassrooms(userId);
    return ApiResponse.success(
      200,
      classrooms,
      'Classrooms fetched successfully',
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findOne(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<ClassroomResponseDto>> {
    const classroom = await this.classroomsService.findClassroomById(
      userId,
      id,
    );
    return ApiResponse.success(
      200,
      classroom,
      'Classroom fetched successfully',
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updateClassroomDto: UpdateClassroomDto,
  ): Promise<ApiResponse<ClassroomResponseDto>> {
    const classroom = await this.classroomsService.updateClassroom(
      userId,
      id,
      updateClassroomDto,
    );
    return ApiResponse.success(
      200,
      classroom,
      'Classroom updated successfully',
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<void>> {
    await this.classroomsService.deleteClassroom(userId, id);
    return ApiResponse.success(
      200,
      undefined,
      'Classroom deleted successfully',
    );
  }
}
