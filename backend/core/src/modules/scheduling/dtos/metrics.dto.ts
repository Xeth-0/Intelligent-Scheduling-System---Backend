import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class MetricChangeDto {
  @ApiProperty({ enum: ['increase', 'decrease', 'no-change'] })
  @IsString()
  type!: 'increase' | 'decrease' | 'no-change';

  @ApiProperty()
  @IsString()
  value!: string;
}

export class MetricDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsNumber()
  value!: number;

  @ApiProperty()
  @ValidateNested()
  @Type(() => MetricChangeDto)
  change!: MetricChangeDto;

  @ApiProperty()
  @IsString()
  icon!: string;
}

export class RoomUtilizationDto {
  @ApiProperty()
  @IsNumber()
  overall!: number;

  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BuildingUtilizationDto)
  byBuilding!: BuildingUtilizationDto[];
}

export class BuildingUtilizationDto {
  @ApiProperty()
  @IsString()
  buildingId!: string;

  @ApiProperty()
  @IsString()
  buildingName!: string;

  @ApiProperty()
  @IsNumber()
  utilization!: number;

  @ApiProperty()
  @IsNumber()
  totalMinutesScheduled!: number;

  @ApiProperty()
  @IsNumber()
  totalMinutesAvailable!: number;
}

export class TeacherWorkloadDto {
  @ApiProperty()
  @IsString()
  teacherId!: string;

  @ApiProperty()
  @IsString()
  teacherName!: string;

  @ApiProperty()
  @IsNumber()
  totalSessions!: number;

  @ApiProperty()
  @IsNumber()
  preferenceSatisfactionRatio!: number;

  @ApiProperty()
  @IsArray()
  @IsNumber({}, { each: true })
  dailySessions!: number[];
}

export class TeacherPreferenceTrendDto {
  @ApiProperty()
  @IsString()
  timeslot!: string;

  @ApiProperty()
  @IsNumber()
  preferCount!: number;

  @ApiProperty()
  @IsNumber()
  avoidCount!: number;

  @ApiProperty()
  @IsNumber()
  neutralCount!: number;
}

export class CrowdedTimeslotDto {
  @ApiProperty()
  @IsString()
  day!: string;

  @ApiProperty()
  @IsString()
  timeslot!: string;

  @ApiProperty()
  @IsNumber()
  usagePercentage!: number;

  @ApiProperty()
  @IsNumber()
  sessionCount!: number;

  @ApiProperty()
  @IsNumber()
  roomsAvailable!: number;
}

export class ScheduleQualityDto {
  @ApiProperty()
  @IsNumber()
  roomUtilization!: number;

  @ApiProperty()
  @IsNumber()
  teacherPreferenceSatisfaction!: number;

  @ApiProperty()
  @IsNumber()
  teacherWorkloadBalance!: number;

  @ApiProperty()
  @IsNumber()
  studentGroupConflictRate!: number;

  @ApiProperty()
  @IsNumber()
  scheduleCompactness!: number;

  @ApiProperty()
  @IsNumber()
  overallScore!: number;
}

export class MetricsQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  scheduleId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  campusId?: string;
}

export class AlertDto {
  @ApiProperty()
  @IsString()
  id!: string;

  @ApiProperty({ enum: ['error', 'warning', 'success', 'info'] })
  @IsString()
  type!: 'error' | 'warning' | 'success' | 'info';

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actionLink?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  actionText?: string;
}
