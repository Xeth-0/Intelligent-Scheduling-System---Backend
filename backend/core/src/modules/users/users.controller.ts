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
  import { CustomApiResponse } from '../../common/response/api-response.dto';
  import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dtos';
  import {
    GetProfileDocs,
    CreateUserDocs,
    GetAllUsersDocs,
    GetUserByIdDocs,
    UpdateUserDocs,
    DeleteUserDocs,
  } from '../../common/decorators/swagger/users.swagger.docs';
  
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
    async getProfile(@Req() req): Promise<CustomApiResponse<UserResponseDto>> {
      console.log('GetProfile: ', req.user);
      const user = await this.usersService.findUserById(req.user.userId);
      return new CustomApiResponse({ success: true, data: user });
    }
  
    @Post()
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.CREATED)
    @CreateUserDocs()
    async create(
      @Body() createUserDto: CreateUserDto,
    ): Promise<CustomApiResponse<UserResponseDto>> {
      if (createUserDto.role === Role.STUDENT) {
        throw new ForbiddenException(
          'Admins can only create admin and teacher accounts',
        );
      }
      const user = await this.usersService.createUser(createUserDto);
      return new CustomApiResponse({ success: true, data: user });
    }
  
    @Get()
    @Roles(Role.ADMIN)
    @GetAllUsersDocs()
    async findAll(): Promise<CustomApiResponse<UserResponseDto[]>> {
      const users = await this.usersService.findAllUsers();
      return new CustomApiResponse({ success: true, data: users });
    }
  
    @Get(':id')
    @Roles(Role.ADMIN, Role.TEACHER)
    @GetUserByIdDocs()
    async findOne(
      @Param('id') id: string,
    ): Promise<CustomApiResponse<UserResponseDto>> {
      const user = await this.usersService.findUserById(id);
      return new CustomApiResponse({ success: true, data: user });
    }
  
    @Put(':id')
    @Roles(Role.ADMIN)
    @UpdateUserDocs()
    async update(
      @Param('id') id: string,
      @Body() updateUserDto: UpdateUserDto,
    ): Promise<CustomApiResponse<UserResponseDto>> {
      const user = await this.usersService.updateUser(id, updateUserDto);
      return new CustomApiResponse({ success: true, data: user });
    }
  
    @Delete(':id')
    @Roles(Role.ADMIN)
    @DeleteUserDocs()
    async remove(@Param('id') id: string): Promise<CustomApiResponse<void>> {
      await this.usersService.deleteUser(id);
      return new CustomApiResponse({
        success: true,
        data: undefined,
        message: 'User deleted successfully',
      });
    }
  }
  