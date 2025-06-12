import {
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  ForbiddenException,
  DefaultValuePipe,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from '@/modules/users/users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
} from '@/modules/users/dtos';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';
import {
  GetProfileDocs,
  CreateUserDocs,
  GetAllUsersDocs,
  GetUserByIdDocs,
  UpdateUserDocs,
  DeleteUserDocs,
} from '@/common/decorators/swagger/users.swagger.docs';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';

@Controller('users')
@ApiBearerAuth()
@ApiTags('Users')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  @GetProfileDocs()
  async getProfile(
    @GetUser('sub') userId: string,
  ): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.usersService.findUserById(userId);
    return ApiResponse.success(200, user, 'Profile fetched successfully');
  }

  @Post()
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @CreateUserDocs()
  async create(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ApiResponse<UserResponseDto>> {
    if (createUserDto.role === Role.STUDENT) {
      throw new ForbiddenException(
        'Admins can only create admin and teacher accounts',
      );
    }
    const user = await this.usersService.createUser(createUserDto);
    return ApiResponse.success(201, user, 'User created successfully');
  }

  @Get()
  @Roles(Role.ADMIN)
  @GetAllUsersDocs()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(10), ParseIntPipe) size: number,
  ): Promise<ApiResponse<UserResponseDto[]>> {
    const paginatedItems = await this.usersService.findAllUsers(page, size);

    return ApiResponse.success(
      200,
      paginatedItems.data,
      'Users fetched successfully',
      paginatedItems.pagination,
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @GetUserByIdDocs()
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.usersService.findUserById(id);
    return ApiResponse.success(200, user, 'User fetched successfully');
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UpdateUserDocs()
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.usersService.updateUser(id, updateUserDto);
    return ApiResponse.success(200, user, 'User updated successfully');
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @DeleteUserDocs()
  async remove(@Param('id') id: string): Promise<ApiResponse<void>> {
    await this.usersService.deleteUser(id);
    return ApiResponse.success(200, undefined, 'User deleted successfully');
  }
}
