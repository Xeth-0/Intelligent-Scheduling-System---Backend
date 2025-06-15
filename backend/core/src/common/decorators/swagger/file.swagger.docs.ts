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
  ApiConsumes,
} from '@nestjs/swagger';
import { UploadFileDto } from '../../../modules/file/dtos/upload.dto';
import { ValidationQueuedDto } from '../../../modules/file/dtos/validation-queued.dto';
import { TaskDetailDto, TaskDto } from '../../../modules/file/dtos/task.dto';

export const UploadFileDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Upload CSV file for validation',
      description:
        'Upload a CSV file for validation and processing. Only admins can upload files.',
    }),
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      type: UploadFileDto,
      description: 'File upload data',
      examples: {
        students: {
          summary: 'Upload students CSV',
          value: {
            file: '(binary)',
            category: 'students',
            description: 'Student data for Spring 2024',
          },
        },
        courses: {
          summary: 'Upload courses CSV',
          value: {
            file: '(binary)',
            category: 'courses',
            description: 'Course catalog for 2024',
          },
        },
      },
    }),
    ApiCreatedResponse({
      description: 'File queued for validation successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 201 },
          message: { type: 'string', example: 'File queued for validation' },
          data: {
            type: 'object',
            properties: {
              taskId: { type: 'string', example: 'uuid-string' },
            },
          },
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
      description: 'Invalid file format or missing required fields',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Invalid file format' },
        },
      },
    }),
  );
};

export const DownloadTemplateDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Download CSV template',
      description:
        'Download a template CSV file for a specific category. Only admins can download templates.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'category',
      description: 'Category of the template to download',
      example: 'students',
      type: 'string',
      enum: ['students', 'courses', 'faculty'],
    }),
    ApiOkResponse({
      description: 'Template file downloaded successfully',
      schema: {
        type: 'string',
        format: 'binary',
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
      description: 'Template not found for the specified category',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Template not found' },
        },
      },
    }),
  );
};

export const GetAllTasks = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all validation tasks',
      description:
        'Retrieve a paginated list of all file validation tasks. Only admins can access this endpoint.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Tasks retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'All tasks fetched successfully',
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                taskId: { type: 'string', example: 'uuid-string' },
                adminId: { type: 'string', example: 'uuid-string' },
                campusId: { type: 'string', example: 'uuid-string' },
                fileName: { type: 'string', example: 'students.csv' },
                status: {
                  type: 'string',
                  enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
                },
                errorCount: { type: 'number', example: 0 },
                description: {
                  type: 'string',
                  example: 'Student data for Spring 2024',
                },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
          },
          pagination: {
            type: 'object',
            properties: {
              totalItems: { type: 'number', example: 100 },
              currentPage: { type: 'number', example: 1 },
              totalPages: { type: 'number', example: 10 },
              itemsPerPage: { type: 'number', example: 10 },
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

export const GetTaskById = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get task details by ID',
      description:
        'Retrieve detailed information about a specific validation task, including any errors encountered.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'taskId',
      description: 'Task ID (UUID)',
      example: 'uuid-string',
      type: 'string',
    }),
    ApiOkResponse({
      description: 'Task details retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Task detail fetched successfully',
          },
          data: {
            type: 'object',
            properties: {
              taskId: { type: 'string', example: 'uuid-string' },
              adminId: { type: 'string', example: 'uuid-string' },
              campusId: { type: 'string', example: 'uuid-string' },
              fileName: { type: 'string', example: 'students.csv' },
              status: {
                type: 'string',
                enum: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED'],
              },
              errorCount: { type: 'number', example: 2 },
              description: {
                type: 'string',
                example: 'Student data for Spring 2024',
              },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
              errors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    errorId: { type: 'string', example: 'uuid-string' },
                    taskId: { type: 'string', example: 'uuid-string' },
                    rowNumber: { type: 'number', example: 5 },
                    message: {
                      type: 'string',
                      example: 'Invalid email format',
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                  },
                },
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
    ApiNotFoundResponse({
      description: 'Task not found with the provided ID',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Task not found' },
        },
      },
    }),
  );
};

// export const LoginDocs = () => {
//   return applyDecorators(
//     ApiOperation({ summary: 'User login' }),
//     ApiResponse({
//       status: 200,
//       description: 'Successful login',
//       type: TokensDto,
//     }),
//     ApiResponse({ status: 401, description: 'Invalid credentials' }),
//     ApiBody({ type: LoginDto }),
//   );
// };
