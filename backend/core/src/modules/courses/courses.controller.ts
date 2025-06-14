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
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CoursesService } from './courses.service';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto } from './dtos';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';

@Controller('courses')
@ApiBearerAuth()
@ApiTags('Courses')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser('sub') userId: string,
    @Body() createCourseDto: CreateCourseDto,
  ): Promise<ApiResponse<CourseResponseDto>> {
    const course = await this.coursesService.createCourse(
      userId,
      createCourseDto,
    );
    return ApiResponse.success(201, course, 'Course created successfully');
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findAll(
    @GetUser('sub') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(10), ParseIntPipe) size: number,
  ): Promise<ApiResponse<CourseResponseDto[]>> {
    const courses = await this.coursesService.findAllCourses(
      userId,
      page,
      size,
    );
    return ApiResponse.success(
      200,
      courses.data,
      'Courses fetched successfully',
      courses.pagination,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findOne(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<CourseResponseDto>> {
    const course = await this.coursesService.findCourseById(userId, id);
    return ApiResponse.success(200, course, 'Course fetched successfully');
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
  ): Promise<ApiResponse<CourseResponseDto>> {
    const course = await this.coursesService.updateCourse(
      userId,
      id,
      updateCourseDto,
    );
    return ApiResponse.success(200, course, 'Course updated successfully');
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<void>> {
    await this.coursesService.deleteCourse(userId, id);
    return ApiResponse.success(200, undefined, 'Course deleted successfully');
  }
}
