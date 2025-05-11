import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { LoginDto, RegisterDto, TokensDto } from '../../../modules/auth/dtos';

export const LoginDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'User login' }),
    ApiResponse({
      status: 200,
      description: 'Successful login',
      type: TokensDto,
    }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
    ApiBody({ type: LoginDto }),
  );
};

export const RegisterDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Register new student account' }),
    ApiResponse({
      status: 201,
      description: 'Successful registration',
      type: TokensDto,
    }),
    ApiResponse({ status: 409, description: 'Email already exists' }),
    ApiBody({ type: RegisterDto }),
  );
};

export const RefreshDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh access token using Authorization header',
    }),
    ApiBearerAuth(),
    ApiResponse({
      status: 200,
      description: 'Tokens refreshed successfully',
      type: TokensDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Invalid or expired refresh token',
    }),
  );
};

export const LogoutDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Logout user' }),
    ApiResponse({ status: 200, description: 'Logout successful' }),
  );
};
