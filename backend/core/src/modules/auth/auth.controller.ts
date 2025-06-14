import { ApiTags } from '@nestjs/swagger';
import {
  LoginDocs,
  RegisterDocs,
  RefreshDocs,
  DebugGetAllUsersDocs,
  DebugAdminLoginDocs,
  DebugStudentLoginDocs,
  DebugTeacherLoginDocs,
} from '../../common/decorators/swagger/auth.swagger.docs';
import { LoginDto, RegisterDto, TokensDto } from './dtos';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiResponse } from '../../common/response/api-response.dto';
import { RefreshJwtAuthGuard } from '../../common/guards/refresh-jwt-auth.guard';
import { LogoutDocs } from '../../common/decorators/swagger/auth.swagger.docs';
import { GetUser, Public } from '../../common/decorators/auth';
import { Request } from 'express';
import { UserResponseDto } from '../users/dtos';
@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @LoginDocs()
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse<TokensDto>> {
    const tokens = await this.authService.login(loginDto);
    return ApiResponse.success(200, tokens, 'Login successful');
  }

  // @Post('register')
  // @RegisterDocs()
  // async register(
  //   @Body() registerDto: RegisterDto,
  // ): Promise<ApiResponse<TokensDto>> {
  //   const tokens = await this.authService.register(registerDto);
  //   return ApiResponse.success(201, tokens, 'Registration successful');
  // }

  @Post('refresh')
  @RefreshDocs()
  @UseGuards(RefreshJwtAuthGuard)
  async refresh(@Req() req: Request): Promise<ApiResponse<TokensDto>> {
    const refreshToken = req
      .get('authorization')
      ?.replace('Bearer ', '')
      .trim();
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    return ApiResponse.success(200, tokens, 'Tokens refreshed successfully');
  }

  @Get('logout')
  @LogoutDocs()
  async logout(@GetUser() user: User): Promise<ApiResponse<void>> {
    await this.authService.logout(user.userId);
    return ApiResponse.success(200, undefined, 'Logout successful');
  }

  // ! Debug Routes. Remove before production.
  @Get('debug_get_all_users')
  @DebugGetAllUsersDocs()
  async debugGetAllUsers(): Promise<ApiResponse<UserResponseDto[]>> {
    const users = await this.usersService.findAllUsers();
    return ApiResponse.success(200, users.data, 'Users fetched successfully');
  }

  @Post('debug_admin_login')
  @Public()
  @DebugAdminLoginDocs()
  async getAdminToken(): Promise<ApiResponse<TokensDto>> {
    const loginDto = {
      email: 'admin1@email.email',
      password: 'adminpassword1',
    };
    const tokens = await this.authService.login(loginDto);
    return ApiResponse.success(200, tokens, 'Admin login successful');
  }

  @Post('debug_student_login')
  @Public()
  @DebugStudentLoginDocs()
  async getStudentToken(): Promise<ApiResponse<TokensDto>> {
    const loginDto = {
      email: 'student1@email.email',
      password: 'studentpassword1',
    };
    const tokens = await this.authService.login(loginDto);
    return ApiResponse.success(200, tokens, 'Student login successful');
  }

  @Post('debug_teacher_login')
  @Public()
  @DebugTeacherLoginDocs()
  async getTeacherToken(): Promise<ApiResponse<TokensDto>> {
    const loginDto = {
      email: 'teacher1@email.email',
      password: 'teacher1password',
    };
    const tokens = await this.authService.login(loginDto);
    return ApiResponse.success(200, tokens, 'Teacher login successful');
  }
}
