import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsEnum,
  Min,
} from 'class-validator';
import { ClassroomType } from '@prisma/client';

export class UpdateClassroomDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiProperty({ enum: ClassroomType, required: false })
  @IsEnum(ClassroomType)
  @IsOptional()
  type?: ClassroomType;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  buildingId?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isWheelchairAccessible?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  openingTime?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  closingTime?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @IsOptional()
  floor?: number;
}
