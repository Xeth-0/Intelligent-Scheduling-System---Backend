import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateTeacherDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @IsUUID()
  departmentId?: string;
}
