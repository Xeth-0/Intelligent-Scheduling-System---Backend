import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { SessionType } from '@prisma/client';

export class CreateCourseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  ectsCredits?: number;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiProperty({ enum: SessionType, required: false })
  @IsEnum(SessionType)
  @IsOptional()
  sessionType?: SessionType;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sessionsPerWeek!: number;
}
