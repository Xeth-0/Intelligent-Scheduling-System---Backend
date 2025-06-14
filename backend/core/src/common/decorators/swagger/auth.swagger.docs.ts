import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiBody,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { LoginDto, RegisterDto } from '../../../modules/auth/dtos';

export const LoginDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'User login',
      description:
        'Authenticate user with email and password to receive access and refresh tokens',
    }),
    ApiBody({
      type: LoginDto,
      description: 'User login credentials',
      examples: {
        example1: {
          summary: 'Student login',
          value: {
            email: 'student@university.edu',
            password: 'password123',
          },
        },
        example2: {
          summary: 'Admin login',
          value: {
            email: 'admin@university.edu',
            password: 'adminpassword',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Login successful - Returns access and refresh tokens',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Login successful' },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid credentials',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 401 },
          message: { type: 'string', example: 'Invalid credentials' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Validation error - Invalid email format or missing fields',
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

export const RegisterDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Register new student account',
      description:
        'Create a new student account. First user will automatically become admin.',
    }),
    ApiBody({
      type: RegisterDto,
      description: 'User registration data',
      examples: {
        student: {
          summary: 'Student registration',
          value: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@university.edu',
            password: 'password123',
          },
        },
        firstUser: {
          summary: 'First user (becomes admin)',
          value: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@university.edu',
            password: 'adminpassword',
          },
        },
      },
    }),
    ApiCreatedResponse({
      description:
        'Registration successful - Returns access and refresh tokens',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 201 },
          message: {
            type: 'string',
            example: 'Registration successful (Student)',
          },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      },
    }),
    ApiConflictResponse({
      description: 'Email already exists',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 409 },
          message: { type: 'string', example: 'Email already exists' },
        },
      },
    }),
    ApiBadRequestResponse({
      description:
        'Validation error - Invalid email format, weak password, or missing fields',
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

export const RefreshDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Get new access and refresh tokens using valid refresh token in Authorization header',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Tokens refreshed successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Tokens refreshed successfully' },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired refresh token',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 401 },
          message: {
            type: 'string',
            example: 'Invalid or expired refresh token',
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Refresh token is required in Authorization header',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Refresh token is required' },
        },
      },
    }),
  );
};

export const LogoutDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Logout user',
      description: 'Invalidate current user session and refresh token',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Logout successful',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Logout successful' },
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
  );
};

// Debug route documentation (should be removed in production)
export const DebugGetAllUsersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '[DEBUG] Get all users',
      description:
        'DEBUG ENDPOINT - Get all users without authentication. Remove before production.',
      deprecated: true,
    }),
    ApiOkResponse({
      description: 'Users fetched successfully',
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
  );
};

export const DebugAdminLoginDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '[DEBUG] Admin login',
      description:
        'DEBUG ENDPOINT - Quick admin login for testing. Remove before production.',
      deprecated: true,
    }),
    ApiOkResponse({
      description: 'Admin login successful',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Admin login successful' },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      },
    }),
  );
};

export const DebugStudentLoginDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '[DEBUG] Student login',
      description:
        'DEBUG ENDPOINT - Quick student login for testing. Remove before production.',
      deprecated: true,
    }),
    ApiOkResponse({
      description: 'Student login successful',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Student login successful' },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      },
    }),
  );
};

export const DebugTeacherLoginDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '[DEBUG] Teacher login',
      description:
        'DEBUG ENDPOINT - Quick teacher login for testing. Remove before production.',
      deprecated: true,
    }),
    ApiOkResponse({
      description: 'Teacher login successful',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: { type: 'string', example: 'Teacher login successful' },
          data: {
            type: 'object',
            properties: {
              accessToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
              refreshToken: {
                type: 'string',
                example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
              },
            },
          },
        },
      },
    }),
  );
};
