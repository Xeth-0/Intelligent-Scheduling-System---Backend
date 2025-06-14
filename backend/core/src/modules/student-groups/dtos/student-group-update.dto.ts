import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, Min } from 'class-validator';

export class UpdateStudentGroupDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  size?: number;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  accessibilityRequirement?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  departmentId?: string;
}
