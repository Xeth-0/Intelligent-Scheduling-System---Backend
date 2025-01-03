import { ApiTags } from '@nestjs/swagger';
import {
  LoginDocs,
  RegisterDocs,
  RefreshDocs,
} from '../../common/decorators/swagger/auth.swagger.docs';
import { LoginDto, RegisterDto, RefreshTokenDto, TokensDto } from './dtos';
import { Role, User } from '@prisma/client';
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
import { CustomApiResponse } from '../../common/response/api-response.dto';
import { RefreshJwtAuthGuard } from '../../common/guards/refresh-jwt-auth.guard';
import { LogoutDocs } from '../../common/decorators/swagger/auth.swagger.docs';
import { GetUser } from '../../common/decorators/auth';
import { Request } from 'express';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @LoginDocs()
  async login(
    @Body() loginDto: LoginDto,
  ): Promise<CustomApiResponse<TokensDto>> {
    const tokens = await this.authService.login(loginDto);
    return new CustomApiResponse({
      success: true,
      data: tokens,
      message: 'Login successful',
    });
  }

  @Post('register')
  @RegisterDocs()
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<CustomApiResponse<TokensDto>> {
    // If the user is the first user, force role to be ADMIN
    const isFirstUser = await this.usersService.isFirstUser();
    if (isFirstUser) {
      console.log('First user, forcing role to ADMIN');
      registerDto.role = Role.ADMIN;
    } else {
      // Force role to be STUDENT for public registration
      console.log('Creating student account');
      registerDto.role = Role.STUDENT;
    }

    const tokens = await this.authService.register(registerDto);

    return new CustomApiResponse({
      success: true,
      data: tokens,
      message:
        'Registration successful' +
        (isFirstUser ? ' (First user)' : '') +
        (registerDto.role === Role.STUDENT ? ' (Student)' : ' (Admin)'),
    });
  }

  @Post('refresh')
  @RefreshDocs()
  @UseGuards(RefreshJwtAuthGuard)
  async refresh(
    @Req() req: Request,
  ): Promise<CustomApiResponse<TokensDto>> {
    const refreshToken = req.get('authorization')?.replace('Bearer ', '').trim();
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const tokens = await this.authService.refreshTokens(refreshToken);
    return new CustomApiResponse({
      success: true,
      data: tokens,
      message: 'Tokens refreshed successfully',
    });
  }

  @Get('logout')
  @LogoutDocs()
  async logout(@GetUser() user: User): Promise<CustomApiResponse<void>> {
    await this.authService.logout(user.userId);
    return new CustomApiResponse({
      success: true,
      message: 'Logout successful',
      data: undefined,
    });
  }

  @Get('test_exception')
  async testException() {
    throw new Error('Test exception');
  }
}
