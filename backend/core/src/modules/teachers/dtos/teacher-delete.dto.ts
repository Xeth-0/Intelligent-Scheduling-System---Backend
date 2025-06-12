import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class UnassignTeacherDto {
  // Recieves a list of course Ids, and teacher Id.
  // Removes the teacher from the courses.
  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  courseIds!: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  teacherId!: string;
}
