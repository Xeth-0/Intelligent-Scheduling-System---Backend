import {
  Controller,
  Get,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { ApiResponse } from '@/common/response/api-response.dto';
import { TimeslotService } from './timeslots.service';
import { TimeslotResponseDto } from './dtos';
import { plainToInstance } from 'class-transformer';

@Controller('timeslots')
@ApiBearerAuth()
@ApiTags('Timeslots')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class TimeslotController {
  constructor(private readonly timeslotService: TimeslotService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get all available timeslots' })
  @SwaggerResponse({
    status: 200,
    description: 'Timeslots retrieved successfully',
    type: ApiResponse<TimeslotResponseDto[]>,
  })
  async getAllTimeslots() {
    const timeslots = await this.timeslotService.getAllTimeslots();

    return ApiResponse.success(
      200,
      plainToInstance(TimeslotResponseDto, timeslots),
      'Timeslots retrieved successfully',
    );
  }

  @Get('codes')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get timeslot codes for scheduling service' })
  @SwaggerResponse({
    status: 200,
    description: 'Timeslot codes retrieved successfully',
    type: ApiResponse<string[]>,
  })
  async getTimeslotCodes() {
    const codes = await this.timeslotService.getTimeslotCodesForScheduling();

    return ApiResponse.success(
      200,
      codes,
      'Timeslot codes retrieved successfully',
    );
  }
}
