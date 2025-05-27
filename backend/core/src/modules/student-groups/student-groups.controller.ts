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
import { StudentGroupsService } from './student-groups.service';
import {
  CreateStudentGroupDto,
  UpdateStudentGroupDto,
  StudentGroupResponseDto,
} from './dtos';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';

@Controller('student-groups')
@ApiBearerAuth()
@ApiTags('Student Groups')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentGroupsController {
  constructor(private readonly studentGroupsService: StudentGroupsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser('sub') userId: string,
    @Body() createStudentGroupDto: CreateStudentGroupDto,
  ): Promise<ApiResponse<StudentGroupResponseDto>> {
    const studentGroup = await this.studentGroupsService.createStudentGroup(
      userId,
      createStudentGroupDto,
    );
    return ApiResponse.success(
      201,
      studentGroup,
      'Student group created successfully',
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findAll(
    @GetUser('sub') userId: string,
  ): Promise<ApiResponse<StudentGroupResponseDto[]>> {
    const studentGroups =
      await this.studentGroupsService.findAllStudentGroups(userId);
    return ApiResponse.success(
      200,
      studentGroups,
      'Student groups fetched successfully',
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findOne(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<StudentGroupResponseDto>> {
    const studentGroup = await this.studentGroupsService.findStudentGroupById(
      userId,
      id,
    );
    return ApiResponse.success(
      200,
      studentGroup,
      'Student group fetched successfully',
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  async update(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updateStudentGroupDto: UpdateStudentGroupDto,
  ): Promise<ApiResponse<StudentGroupResponseDto>> {
    const studentGroup = await this.studentGroupsService.updateStudentGroup(
      userId,
      id,
      updateStudentGroupDto,
    );
    return ApiResponse.success(
      200,
      studentGroup,
      'Student group updated successfully',
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  async remove(
    @GetUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<ApiResponse<void>> {
    await this.studentGroupsService.deleteStudentGroup(userId, id);
    return ApiResponse.success(
      200,
      undefined,
      'Student group deleted successfully',
    );
  }
}
