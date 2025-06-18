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
  Res,
  StreamableFile,
  Delete,
} from '@nestjs/common';
import { Response } from 'express';
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
  DeleteScheduleDocs,
} from '@/common/decorators/swagger/scheduling.swagger.docs';
import { ApiParam } from '@nestjs/swagger';
@Controller('schedules')
@ApiBearerAuth()
@ApiTags('Scheduling')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Post('/generate/:scheduleName?')
  @Roles(Role.ADMIN)
  @ApiParam({
    name: 'scheduleName',
    required: false,
    description: 'Schedule name',
  })
  async generateSchedule(
    @GetUser() admin: User,
    @Param('scheduleName') scheduleName?: string,
  ) {
    const finalScheduleName =
      scheduleName ?? 'Unnamed Schedule - ' + new Date().toISOString();
    const resp = await this.schedulingService.generateSchedule(
      admin.userId,
      finalScheduleName,
    );
    return ApiResponse.success(201, resp, 'Schedule generated successfully');
  }

  @Get('/active')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async getActiveSchedule(@GetUser() user: User) {
    const resp = await this.schedulingService.getActiveSchedule(user.userId);
    return ApiResponse.success(
      200,
      resp,
      'Active schedule retrieved successfully',
    );
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
    console.log(`filtered schedule response`, resp);
    return ApiResponse.success(200, resp, 'Sessions retrieved successfully');
  }

  @Post('/export/pdf')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async exportScheduleToPdf(
    @GetUser() user: User,
    @Body() body: SearchSessionsBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdfBuffer = await this.schedulingService.exportScheduleToPdf(
      user.userId,
      body,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="schedule-${body.scheduleId}-${new Date().toISOString().split('T')[0]}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }

  @Get('/evaluate/id/:scheduleId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async evaluateSchedule(
    @GetUser() user: User,
    @Param('scheduleId') scheduleId: string,
  ) {
    const resp = await this.schedulingService.evaluateSchedule(
      user.userId,
      scheduleId,
    );
    return ApiResponse.success(200, resp, 'Schedule evaluated successfully');
  }

  @Delete(':scheduleId')
  @Roles(Role.ADMIN)
  @DeleteScheduleDocs()
  async deleteSchedule(
    @GetUser() admin: User,
    @Param('scheduleId') scheduleId: string,
  ) {
    await this.schedulingService.deleteSchedule(admin.userId, scheduleId);
    return ApiResponse.success(200, null, 'Schedule deleted successfully');
  }
}
