/* eslint-disable @typescript-eslint/no-unused-vars */
// remove all the eslint checks for this file for now

/* eslint-d,
  Postisable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Get,
  Query,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  Post,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { GetGeneralScheduleDocs } from '@/common/decorators/swagger/scheduling.swagger.docs';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { SchedulingService } from './scheduling.service';
import { GeneralScheduleWrapperDto } from './dtos/generalSchedule.dto';
import { TeacherScheduleWrapperDto } from './dtos/teacherSchedule.dto';
import { PrismaService } from '@/prisma/prisma.service';
import { Public } from '@/common/decorators/auth/public.decorator';

@Controller('schedules')
@ApiBearerAuth()
@ApiTags('Scheduling')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  constructor(
    private readonly schedulingService: SchedulingService,
    private readonly prismaService: PrismaService,
  ) {}

  // @Get()
  // @GetGeneralScheduleDocs()
  // @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  // async getGeneralSchedule(
  //   @Query('classGroupId') classGroupId?: string,
  // ): Promise<GeneralScheduleWrapperDto> {
  //   return await this.schedulingService.getGeneralSchedule(classGroupId);
  // }

  // // Filter by teacherID and/or classGroupId from the query params
  // @Get('/:teacherId/:classGroupId')
  // async getTeacherSchedule(
  //   @Query('teacherId') teacherId?: string,
  //   @Query('classGroupId') classGroupId?: string,
  // ): Promise<TeacherScheduleWrapperDto> {
  //   console.log('Getting filtered schedule...');
  //   console.log(`teacherId: ${teacherId}, classGroupId: ${classGroupId}`);
  //   return await this.schedulingService.getFilteredSchedule(
  //     teacherId,
  //     classGroupId,
  //   );
  // }

  @Post('generate')
  @Public()
  async generateSchedule() {
    return await this.schedulingService.generateSchedule();
  }
}
