import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @Length(2, 50)
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @Length(2, 50)
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;
  //   @Matches(/@(student|staff)\.university\.edu$/, {
  //     message: 'Email must be a valid university email'
  //   })

  @ApiProperty()
  @IsString()
  @Length(8, 100)
  @IsNotEmpty()
  password: string;
  //   @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
  //     message: 'Password too weak'
  //   })

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  departmentId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  classGroupId?: string;
} 