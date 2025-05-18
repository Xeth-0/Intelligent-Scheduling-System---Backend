import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import {
  UserResponseDto,
  CreateUserDto,
  UpdateUserDto,
} from '../../../modules/users/dtos';

export const GetProfileDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get current user profile' }),
    ApiOkResponse({
      description: 'Current user details',
      type: UserResponseDto,
    }),
  );
};

export const CreateUserDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Create new admin/teacher account (admin only)' }),
    ApiCreatedResponse({
      description: 'User created successfully',
      type: UserResponseDto,
    }),
    ApiForbiddenResponse({ description: 'Insufficient permissions' }),
    ApiBody({ type: CreateUserDto }),
  );
};

export const GetAllUsersDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get all users (admin only)' }),
    ApiOkResponse({
      description: 'Successfully retrieved users list',
      type: [UserResponseDto],
    }),
  );
};

export const GetUserByIdDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get user by ID' }),
    ApiOkResponse({
      description: 'User details',
      type: UserResponseDto,
    }),
    ApiParam({ name: 'id', description: 'User ID' }),
  );
};

export const UpdateUserDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Update user (admin only)' }),
    ApiOkResponse({
      description: 'User updated successfully',
      type: UserResponseDto,
    }),
    ApiParam({ name: 'id', description: 'User ID' }),
    ApiBody({ type: UpdateUserDto }),
  );
};

export const DeleteUserDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Delete user (admin only)' }),
    ApiOkResponse({ description: 'User deleted successfully' }),
    ApiParam({ name: 'id', description: 'User ID' }),
  );
};
