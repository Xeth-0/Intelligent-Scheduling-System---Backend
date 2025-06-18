import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as ApiSwaggerResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MetricsService } from './metrics.service';
import {
  MetricDto,
  RoomUtilizationDto,
  TeacherWorkloadDto,
  TeacherPreferenceTrendDto,
  CrowdedTimeslotDto,
  ScheduleQualityDto,
  MetricsQueryDto,
  AlertDto,
} from './dtos/metrics.dto';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';

@Controller('metrics')
@ApiBearerAuth()
@ApiTags('Metrics')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get basic dashboard metrics' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'Dashboard metrics retrieved successfully',
    type: [MetricDto],
  })
  async getDashboardMetrics(
    @GetUser('sub') userId: string,
  ): Promise<ApiResponse<MetricDto[]>> {
    const metrics = await this.metricsService.getDashboardMetrics(userId);
    return ApiResponse.success(
      200,
      metrics,
      'Dashboard metrics retrieved successfully',
    );
  }

  @Get('room-utilization')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get room utilization metrics' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'Room utilization metrics retrieved successfully',
    type: RoomUtilizationDto,
  })
  async getRoomUtilization(
    @GetUser('sub') userId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<ApiResponse<RoomUtilizationDto>> {
    const metrics = await this.metricsService.getRoomUtilization(
      userId,
      query.scheduleId,
    );
    return ApiResponse.success(
      200,
      metrics,
      'Room utilization metrics retrieved successfully',
    );
  }

  @Get('teacher-workload')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get teacher workload metrics' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'Teacher workload metrics retrieved successfully',
    type: [TeacherWorkloadDto],
  })
  async getTeacherWorkload(
    @GetUser('sub') userId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<ApiResponse<TeacherWorkloadDto[]>> {
    const metrics = await this.metricsService.getTeacherWorkload(
      userId,
      query.scheduleId,
    );
    return ApiResponse.success(
      200,
      metrics,
      'Teacher workload metrics retrieved successfully',
    );
  }

  @Get('teacher-preference-trends')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get teacher preference trends' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'Teacher preference trends retrieved successfully',
    type: [TeacherPreferenceTrendDto],
  })
  async getTeacherPreferenceTrends(
    @GetUser('sub') userId: string,
  ): Promise<ApiResponse<TeacherPreferenceTrendDto[]>> {
    const metrics =
      await this.metricsService.getTeacherPreferenceTrends(userId);
    return ApiResponse.success(
      200,
      metrics,
      'Teacher preference trends retrieved successfully',
    );
  }

  @Get('crowded-timeslots')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get crowded timeslots metrics' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'Crowded timeslots metrics retrieved successfully',
    type: [CrowdedTimeslotDto],
  })
  async getCrowdedTimeslots(
    @GetUser('sub') userId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<ApiResponse<CrowdedTimeslotDto[]>> {
    const metrics = await this.metricsService.getCrowdedTimeslots(
      userId,
      query.scheduleId,
    );
    return ApiResponse.success(
      200,
      metrics,
      'Crowded timeslots metrics retrieved successfully',
    );
  }

  @Get('schedule-quality')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get schedule quality metrics' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'Schedule quality metrics retrieved successfully',
    type: ScheduleQualityDto,
  })
  async getScheduleQuality(
    @GetUser('sub') userId: string,
    @Query() query: MetricsQueryDto,
  ): Promise<ApiResponse<ScheduleQualityDto>> {
    const metrics = await this.metricsService.getScheduleQuality(
      userId,
      query.scheduleId,
    );
    return ApiResponse.success(
      200,
      metrics,
      'Schedule quality metrics retrieved successfully',
    );
  }

  @Get('alerts')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get system alerts' })
  @ApiSwaggerResponse({
    status: 200,
    description: 'System alerts retrieved successfully',
    type: [AlertDto],
  })
  async getSystemAlerts(
    @GetUser('sub') userId: string,
  ): Promise<ApiResponse<AlertDto[]>> {
    const alerts = await this.metricsService.getSystemAlerts(userId);
    return ApiResponse.success(
      200,
      alerts,
      'System alerts retrieved successfully',
    );
  }
}
