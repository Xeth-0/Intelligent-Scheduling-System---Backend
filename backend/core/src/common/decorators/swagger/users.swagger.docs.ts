import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiForbiddenResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CreateUserDto, UpdateUserDto } from '../../../modules/users/dtos';

export const GetProfileDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get current user profile',
      description:
        'Retrieve the profile information of the currently authenticated user',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Current user profile retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Profile fetched successfully' },
          data: {
            type: 'object',
            properties: {
              userId: { type: 'string', example: 'uuid-string' },
              firstName: { type: 'string', example: 'John' },
              lastName: { type: 'string', example: 'Doe' },
              email: { type: 'string', example: 'john.doe@university.edu' },
              role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'User not found',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'User not found' },
        },
      },
    }),
  );
};

export const CreateUserDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Create new admin/teacher account (admin only)',
      description:
        'Create a new admin or teacher account. Only admins can create these accounts. Students cannot be created through this endpoint.',
    }),
    ApiBearerAuth(),
    ApiBody({
      type: CreateUserDto,
      description: 'User creation data',
      examples: {
        admin: {
          summary: 'Create admin account',
          value: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@university.edu',
            password: 'adminpassword123',
            role: 'ADMIN',
          },
        },
        teacher: {
          summary: 'Create teacher account',
          value: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@university.edu',
            password: 'teacherpassword123',
            role: 'TEACHER',
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'User created successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 201 },
          message: { type: 'string', example: 'User created successfully' },
          data: {
            type: 'object',
            properties: {
              userId: { type: 'string', example: 'uuid-string' },
              firstName: { type: 'string', example: 'Jane' },
              lastName: { type: 'string', example: 'Smith' },
              email: { type: 'string', example: 'jane.smith@university.edu' },
              role: { type: 'string', enum: ['ADMIN', 'TEACHER'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    }),
    ApiForbiddenResponse({
      description:
        'Insufficient permissions or trying to create student account',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 403 },
          message: {
            type: 'string',
            example: 'Admins can only create admin and teacher accounts',
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation error or email already exists',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Validation failed' },
        },
      },
    }),
  );
};

export const GetAllUsersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all users (admin only)',
      description:
        'Retrieve a list of all users in the system. Only accessible by admins.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Users list retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Users fetched successfully' },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string', example: 'uuid-string' },
                firstName: { type: 'string', example: 'John' },
                lastName: { type: 'string', example: 'Doe' },
                email: { type: 'string', example: 'john.doe@university.edu' },
                role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions - Admin access required',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
  );
};

export const GetUserByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get user by ID (admin/teacher only)',
      description:
        'Retrieve detailed information about a specific user by their ID. Accessible by admins and teachers.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID)',
      example: 'uuid-string',
      type: 'string',
    }),
    ApiOkResponse({
      description: 'User details retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'User fetched successfully' },
          data: {
            type: 'object',
            properties: {
              userId: { type: 'string', example: 'uuid-string' },
              firstName: { type: 'string', example: 'John' },
              lastName: { type: 'string', example: 'Doe' },
              email: { type: 'string', example: 'john.doe@university.edu' },
              role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiForbiddenResponse({
      description:
        'Insufficient permissions - Admin or teacher access required',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'User not found with the provided ID',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'User not found' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid user ID format',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Invalid user ID format' },
        },
      },
    }),
  );
};

export const UpdateUserDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Update user (admin only)',
      description:
        'Update user information including name, email, or role. Only admins can perform this action.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID)',
      example: 'uuid-string',
      type: 'string',
    }),
    ApiBody({
      type: UpdateUserDto,
      description: 'User update data',
      examples: {
        updateName: {
          summary: 'Update user name',
          value: {
            firstName: 'Updated',
            lastName: 'Name',
          },
        },
        updateEmail: {
          summary: 'Update user email',
          value: {
            email: 'newemail@university.edu',
          },
        },
        updateRole: {
          summary: 'Update user role',
          value: {
            role: 'TEACHER',
          },
        },
        updateMultiple: {
          summary: 'Update multiple fields',
          value: {
            firstName: 'John',
            lastName: 'Updated',
            email: 'john.updated@university.edu',
            role: 'TEACHER',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'User updated successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'User updated successfully' },
          data: {
            type: 'object',
            properties: {
              userId: { type: 'string', example: 'uuid-string' },
              firstName: { type: 'string', example: 'Updated' },
              lastName: { type: 'string', example: 'Name' },
              email: { type: 'string', example: 'updated@university.edu' },
              role: { type: 'string', enum: ['ADMIN', 'TEACHER', 'STUDENT'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions - Admin access required',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'User not found with the provided ID',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'User not found' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation error or invalid user ID format',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Validation failed' },
        },
      },
    }),
  );
};

export const DeleteUserDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete user (admin only)',
      description:
        'Permanently delete a user account from the system. Only admins can perform this action.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'User ID (UUID)',
      example: 'uuid-string',
      type: 'string',
    }),
    ApiOkResponse({
      description: 'User deleted successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'User deleted successfully' },
          data: { type: 'null', example: null },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Unauthorized' },
        },
      },
    }),
    ApiForbiddenResponse({
      description: 'Insufficient permissions - Admin access required',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 403 },
          message: { type: 'string', example: 'Forbidden' },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'User not found with the provided ID',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'User not found' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid user ID format',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Invalid user ID format' },
        },
      },
    }),
  );
};
