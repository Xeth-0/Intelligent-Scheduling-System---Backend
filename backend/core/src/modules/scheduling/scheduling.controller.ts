import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  ForbiddenException,
  Request as Req,
} from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/auth/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import {
  ClassGroupSchedule,
  GeneralScheduleWrapperDto,
} from './dtos/generalSchedule.dto';
import { TeacherScheduleWrapperDto } from './dtos/teacherSchedule.dto';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import {
  GetGeneralScheduleDocs,
  GetTeacherScheduleDocs,
} from 'src/common/decorators/swagger/scheduling.swagger.docs';

@Controller('scheduling')
@ApiBearerAuth()
@ApiTags('Scheduling')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  @Get('general')
  @GetGeneralScheduleDocs()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async getGeneralSchedule(
    @Query('classGroupId') classGroupId?: string,
  ): Promise<GeneralScheduleWrapperDto> {
    return await this.schedulingService.getGeneralSchedule(classGroupId);
  }

  @Get('teacher')
  @GetTeacherScheduleDocs()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async getTeacherSchedule(
    @Query('teacherId') teacherId?: string,
  ): Promise<TeacherScheduleWrapperDto> {
    return await this.schedulingService.getTeacherSchedule(teacherId);
  }
}
