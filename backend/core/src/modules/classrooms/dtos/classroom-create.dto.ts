import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
} from 'class-validator';
import { ClassroomType } from '@prisma/client';

export class CreateClassroomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty({ enum: ClassroomType })
  @IsEnum(ClassroomType)
  type!: ClassroomType;

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

  @ApiProperty()
  @IsInt()
  @Min(0)
  floor!: number;
}
