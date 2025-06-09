import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateStudentGroupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  size!: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  accessibilityRequirement?: boolean;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  departmentId!: string;
}
