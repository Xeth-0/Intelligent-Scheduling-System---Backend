import {
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  Post,
  Param,
  Get,
  Query,
  Body,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerApiResponse,
} from '@nestjs/swagger';

import { Roles } from '@/common/decorators/auth/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { SchedulingService } from './scheduling.service';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';
import { SearchSessionsBody } from './dtos/scheduleSearch.dto';
import { ApiResponse } from '@/common/response/api-response.dto';

@Controller('schedules')
@ApiBearerAuth()
@ApiTags('Scheduling')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('/generate')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate a new schedule' })
  @SwaggerApiResponse({
    status: 201,
    description: 'Schedule generated successfully',
  })
  async generateSchedule(@GetUser() admin: User) {
    const resp = await this.schedulingService.generateSchedule(admin.userId);
    return ApiResponse.success(201, resp, 'Schedule generated successfully');
  }

  @Get('/id/:scheduleId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Get a schedule by ID' })
  @ApiParam({ name: 'scheduleId', required: true, description: 'Schedule ID' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Schedule retrieved successfully',
  })
  async getScheduleById(
    @GetUser() user: User,
    @Query('scheduleId') scheduleId: string,
  ) {
    const resp = await this.schedulingService.getScheduleById(
      user.userId,
      scheduleId,
    );
    return ApiResponse.success(200, resp, 'Schedule retrieved successfully');
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all schedules for a campus' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Schedules retrieved successfully',
  })
  async getAllSchedules(@GetUser() admin: User) {
    const resp = await this.schedulingService.getAllSchedules(admin.userId);
    return ApiResponse.success(200, resp, 'Schedules retrieved successfully');
  }

  @Post('/activate/id/:scheduleId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate a schedule' })
  @ApiParam({ name: 'scheduleId', required: true, description: 'Schedule ID' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Schedule activated successfully',
  })
  async activateSchedule(
    @GetUser() admin: User,
    @Param('scheduleId') scheduleId: string,
  ) {
    const resp = await this.schedulingService.activateSchedule(
      admin.userId,
      scheduleId,
    );
    return ApiResponse.success(200, resp, 'Schedule activated successfully');
  }

  @Post('/sessions/id/search')
  @ApiOperation({ summary: 'Search for sessions by ID' })
  @SwaggerApiResponse({
    status: 200,
    description: 'Sessions retrieved successfully',
  })
  async searchSessions(
    @GetUser() user: User,
    @Body() body: SearchSessionsBody,
  ) {
    const resp = await this.schedulingService.searchSessions(user.userId, body);
    return ApiResponse.success(200, resp, 'Sessions retrieved successfully');
  }
}
