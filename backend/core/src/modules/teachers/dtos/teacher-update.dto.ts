import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UpdateTeacherDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  departmentId?: string;
}
