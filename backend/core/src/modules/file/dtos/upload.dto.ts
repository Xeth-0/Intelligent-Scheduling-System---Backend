import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadFileDto {
  @ApiProperty()
  @IsString()
  category!: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  description?: string;
}
