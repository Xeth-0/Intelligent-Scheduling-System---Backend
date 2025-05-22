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
  ApiResponse,
} from '@nestjs/swagger';

import { Roles } from '@/common/decorators/auth/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { SchedulingService } from './scheduling.service';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';
import { SearchSessionsBody } from './dtos/scheduleSearch.dto';

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
  @ApiResponse({ status: 201, description: 'Schedule generated successfully' })
  async generateSchedule(@GetUser() admin: User) {
    return await this.schedulingService.generateSchedule(admin.userId);
  }

  @Get('/id/:scheduleId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @ApiOperation({ summary: 'Get a schedule by ID' })
  @ApiParam({ name: 'scheduleId', required: true, description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule retrieved successfully' })
  async getScheduleById(
    @GetUser() user: User,
    @Query('scheduleId') scheduleId: string,
  ) {
    return await this.schedulingService.getScheduleById(
      user.userId,
      scheduleId,
    );
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all schedules for a campus' })
  @ApiResponse({ status: 200, description: 'Schedules retrieved successfully' })
  async getAllSchedules(@GetUser() admin: User) {
    return await this.schedulingService.getAllSchedules(admin.userId);
  }

  @Post('/activate/id/:scheduleId')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Activate a schedule' })
  @ApiParam({ name: 'scheduleId', required: true, description: 'Schedule ID' })
  @ApiResponse({ status: 200, description: 'Schedule activated successfully' })
  async activateSchedule(
    @GetUser() admin: User,
    @Param('scheduleId') scheduleId: string,
  ) {
    return await this.schedulingService.activateSchedule(
      admin.userId,
      scheduleId,
    );
  }

  @Post('/sessions/id/search')
  @ApiOperation({ summary: 'Search for sessions by ID' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved successfully' })
  async searchSessions(
    @GetUser() user: User,
    @Body() body: SearchSessionsBody,
  ) {
    return await this.schedulingService.searchSessions(user.userId, body);
  }
}
