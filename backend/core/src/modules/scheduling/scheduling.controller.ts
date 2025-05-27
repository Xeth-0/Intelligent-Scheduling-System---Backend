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
  BadRequestException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { Roles } from '@/common/decorators/auth/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { SchedulingService } from './scheduling.service';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';
import { SearchSessionsBody } from './dtos/scheduleSearch.dto';
import { ApiResponse } from '@/common/response/api-response.dto';
import {
  GenerateScheduleDocs,
  GetScheduleByIdDocs,
  GetAllSchedulesDocs,
  ActivateScheduleDocs,
  SearchSessionsDocs,
} from '@/common/decorators/swagger/scheduling.swagger.docs';

@Controller('schedules')
@ApiBearerAuth()
@ApiTags('Scheduling')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('/generate')
  @Roles(Role.ADMIN)
  @GenerateScheduleDocs()
  async generateSchedule(@GetUser() admin: User) {
    const resp = await this.schedulingService.generateSchedule(admin.userId);
    return ApiResponse.success(201, resp, 'Schedule generated successfully');
  }

  @Get('/id/:scheduleId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @GetScheduleByIdDocs()
  async getScheduleById(
    @GetUser() user: User,
    @Query('scheduleId') scheduleId: string | undefined,
  ) {
    if (!scheduleId) {
      throw new BadRequestException('Schedule ID is required');
    }
    const resp = await this.schedulingService.getScheduleById(
      user.userId,
      scheduleId,
    );
    return ApiResponse.success(200, resp, 'Schedule retrieved successfully');
  }

  @Get()
  @Roles(Role.ADMIN)
  @GetAllSchedulesDocs()
  async getAllSchedules(@GetUser() admin: User) {
    const resp = await this.schedulingService.getAllSchedules(admin.userId);
    return ApiResponse.success(200, resp, 'Schedules retrieved successfully');
  }

  @Post('/activate/id/:scheduleId')
  @Roles(Role.ADMIN)
  @ActivateScheduleDocs()
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
  @SearchSessionsDocs()
  async searchSessions(
    @GetUser() user: User,
    @Body() body: SearchSessionsBody,
  ) {
    const resp = await this.schedulingService.searchSessions(user.userId, body);
    return ApiResponse.success(200, resp, 'Sessions retrieved successfully');
  }
}
