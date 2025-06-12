import {
  Get,
  Body,
  Param,
  Patch,
  Delete,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TeachersService } from './teachers.service';
import { UpdateTeacherDto, TeacherResponseDto } from './dtos';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';
import {
  GetAllTeachersDocs,
  GetTeacherByIdDocs,
  UpdateTeacherDocs,
  DeleteTeacherDocs,
} from '@/common/decorators/swagger/teachers.swagger.docs';

@Controller('teachers')
@ApiBearerAuth()
@ApiTags('Teachers')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @GetAllTeachersDocs()
  async findAll(
    @GetUser('sub') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(10), ParseIntPipe) size: number,
  ): Promise<ApiResponse<TeacherResponseDto[]>> {
    const teachers = await this.teachersService.findAllTeachers(
      userId,
      page,
      size,
    );
    return ApiResponse.success(
      200,
      teachers.data,
      'Teachers fetched successfully',
      teachers.pagination,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @GetTeacherByIdDocs()
  async findOne(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<TeacherResponseDto>> {
    const teacher = await this.teachersService.findTeacherById(userId, id);
    return ApiResponse.success(200, teacher, 'Teacher fetched successfully');
  }

  @Patch()
  @Roles(Role.ADMIN)
  @UpdateTeacherDocs()
  async update(
    @GetUser('sub') userId: string,
    @Body() updateTeacherDto: UpdateTeacherDto,
  ): Promise<ApiResponse<TeacherResponseDto>> {
    const teacher = await this.teachersService.updateTeacher(
      userId,
      updateTeacherDto,
    );
    return ApiResponse.success(200, teacher, 'Teacher updated successfully');
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @DeleteTeacherDocs()
  async remove(
    @GetUser('sub') userId: string,
    @Param('id') teacherId: string,
  ): Promise<ApiResponse<void>> {
    await this.teachersService.deleteTeacher(userId, teacherId);
    return ApiResponse.success(200, undefined, 'Teacher deleted successfully');
  }
}
