import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  ForbiddenException,
  Request as Req,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { Roles } from '../../common/decorators/auth/roles.decorator';
import { ApiResponse } from '../../common/response/api-response.dto';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dtos';
import {
  GetProfileDocs,
  CreateUserDocs,
  GetAllUsersDocs,
  GetUserByIdDocs,
  UpdateUserDocs,
  DeleteUserDocs,
} from '../../common/decorators/swagger/users.swagger.docs';
import { ApiRequest } from '../../common/request/api-request.dto';

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
    @Req() req: ApiRequest,
  ): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.usersService.findUserById(req.user.userId);
    return new ApiResponse({ success: true, data: user });
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
    return new ApiResponse({ success: true, data: user });
  }

  @Get()
  @Roles(Role.ADMIN)
  @GetAllUsersDocs()
  async findAll(): Promise<ApiResponse<UserResponseDto[]>> {
    const users = await this.usersService.findAllUsers();
    return new ApiResponse({ success: true, data: users });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @GetUserByIdDocs()
  async findOne(
    @Param('id') id: string,
  ): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.usersService.findUserById(id);
    return new ApiResponse({ success: true, data: user });
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  @UpdateUserDocs()
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserResponseDto>> {
    const user = await this.usersService.updateUser(id, updateUserDto);
    return new ApiResponse({ success: true, data: user });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @DeleteUserDocs()
  async remove(@Param('id') id: string): Promise<ApiResponse<void>> {
    await this.usersService.deleteUser(id);
    return new ApiResponse({
      success: true,
      data: undefined,
      message: 'User deleted successfully',
    });
  }
}
