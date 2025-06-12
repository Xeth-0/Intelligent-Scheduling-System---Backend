import { Role } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  IsBoolean,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @Length(2, 50)
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty()
  @IsString()
  @Length(2, 50)
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @Length(8, 100)
  @IsNotEmpty()
  password!: string;
  //   @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
  //     message: 'Password too weak'
  //   })

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  @IsString()
  @IsNotEmpty()
  role!: Role;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  needWheelchairAccessibleRoom?: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  departmentId?: string;
}
