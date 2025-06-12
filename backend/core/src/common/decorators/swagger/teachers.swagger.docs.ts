import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UpdateTeacherDto } from '@/modules/teachers/dtos';

export const GetAllTeachersDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all teachers',
      description:
        "Retrieve all teachers for the current user's campus. Access is available to all authenticated users.",
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Teachers fetched successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Teachers fetched successfully',
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                teacherId: { type: 'string', example: 'uuid-string' },
                userId: { type: 'string', example: 'uuid-string' },
                departmentId: { type: 'string', example: 'dept-cs-001' },
                user: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string', example: 'uuid-string' },
                    firstName: { type: 'string', example: 'John' },
                    lastName: { type: 'string', example: 'Doe' },
                    email: {
                      type: 'string',
                      example: 'john.doe@university.edu',
                    },
                    role: { type: 'string', example: 'TEACHER' },
                    phone: { type: 'string', example: '+1234567890' },
                    needWheelchairAccessibleRoom: {
                      type: 'boolean',
                      example: false,
                    },
                  },
                },
                department: {
                  type: 'object',
                  properties: {
                    deptId: { type: 'string', example: 'dept-cs-001' },
                    name: { type: 'string', example: 'Computer Science' },
                    campusId: { type: 'string', example: 'campus-001' },
                  },
                },
                courses: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      courseId: { type: 'string', example: 'course-001' },
                      name: { type: 'string', example: 'Advanced Mathematics' },
                      code: { type: 'string', example: 'MATH401' },
                      description: {
                        type: 'string',
                        example: 'Advanced mathematical concepts',
                      },
                      departmentId: { type: 'string', example: 'dept-cs-001' },
                      ectsCredits: { type: 'number', example: 6 },
                      teacherId: { type: 'string', example: 'uuid-string' },
                      sessionType: {
                        type: 'string',
                        enum: ['LECTURE', 'LAB', 'SEMINAR'],
                        example: 'LECTURE',
                      },
                      sessionsPerWeek: { type: 'number', example: 2 },
                    },
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
  );
};

export const GetTeacherByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get teacher by ID',
      description:
        'Retrieve a specific teacher by their ID. Access is available to all authenticated users within the same campus.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'Teacher ID (UUID)',
      example: 'uuid-string',
      type: 'string',
    }),
    ApiOkResponse({
      description: 'Teacher fetched successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Teacher fetched successfully',
          },
          data: {
            type: 'object',
            properties: {
              teacherId: { type: 'string', example: 'uuid-string' },
              userId: { type: 'string', example: 'uuid-string' },
              departmentId: { type: 'string', example: 'dept-cs-001' },
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string', example: 'uuid-string' },
                  firstName: { type: 'string', example: 'John' },
                  lastName: { type: 'string', example: 'Doe' },
                  email: { type: 'string', example: 'john.doe@university.edu' },
                  role: { type: 'string', example: 'TEACHER' },
                  phone: { type: 'string', example: '+1234567890' },
                  needWheelchairAccessibleRoom: {
                    type: 'boolean',
                    example: false,
                  },
                },
              },
              department: {
                type: 'object',
                properties: {
                  deptId: { type: 'string', example: 'dept-cs-001' },
                  name: { type: 'string', example: 'Computer Science' },
                  campusId: { type: 'string', example: 'campus-001' },
                },
              },
              courses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    courseId: { type: 'string', example: 'course-001' },
                    name: { type: 'string', example: 'Advanced Mathematics' },
                    code: { type: 'string', example: 'MATH401' },
                    description: {
                      type: 'string',
                      example: 'Advanced mathematical concepts',
                    },
                    departmentId: { type: 'string', example: 'dept-cs-001' },
                    ectsCredits: { type: 'number', example: 6 },
                    teacherId: { type: 'string', example: 'uuid-string' },
                    sessionType: {
                      type: 'string',
                      enum: ['LECTURE', 'LAB', 'SEMINAR'],
                      example: 'LECTURE',
                    },
                    sessionsPerWeek: { type: 'number', example: 2 },
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
    ApiForbiddenResponse({
      description: 'Insufficient permissions to access this teacher',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 403 },
          message: {
            type: 'string',
            example: 'You do not have permission to access this teacher',
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Teacher not found with the provided ID',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Teacher not found' },
        },
      },
    }),
  );
};

export const UpdateTeacherDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Update teacher (admin only)',
      description:
        'Update teacher information including department and course assignments. Only admins can update teacher data.',
    }),
    ApiBearerAuth(),
    ApiBody({
      type: UpdateTeacherDto,
      description: 'Teacher update data',
      examples: {
        'update-department': {
          summary: 'Update department only',
          value: {
            teacherId: 'uuid-string',
            departmentId: 'dept-cs-001',
          },
        },
        'assign-course': {
          summary: 'Assign course to teacher',
          value: {
            teacherId: 'uuid-string',
            departmentId: 'dept-cs-001',
            courseId: 'course-001',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Teacher updated successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Teacher updated successfully',
          },
          data: {
            type: 'object',
            properties: {
              teacherId: { type: 'string', example: 'uuid-string' },
              userId: { type: 'string', example: 'uuid-string' },
              departmentId: { type: 'string', example: 'dept-cs-001' },
              user: {
                type: 'object',
                properties: {
                  userId: { type: 'string', example: 'uuid-string' },
                  firstName: { type: 'string', example: 'John' },
                  lastName: { type: 'string', example: 'Doe' },
                  email: { type: 'string', example: 'john.doe@university.edu' },
                  role: { type: 'string', example: 'TEACHER' },
                  phone: { type: 'string', example: '+1234567890' },
                  needWheelchairAccessibleRoom: {
                    type: 'boolean',
                    example: false,
                  },
                },
              },
              department: {
                type: 'object',
                properties: {
                  deptId: { type: 'string', example: 'dept-cs-001' },
                  name: { type: 'string', example: 'Computer Science' },
                  campusId: { type: 'string', example: 'campus-001' },
                },
              },
              courses: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    courseId: { type: 'string', example: 'course-001' },
                    name: { type: 'string', example: 'Advanced Mathematics' },
                    code: { type: 'string', example: 'MATH401' },
                    description: {
                      type: 'string',
                      example: 'Advanced mathematical concepts',
                    },
                    departmentId: { type: 'string', example: 'dept-cs-001' },
                    ectsCredits: { type: 'number', example: 6 },
                    teacherId: { type: 'string', example: 'uuid-string' },
                    sessionType: {
                      type: 'string',
                      enum: ['LECTURE', 'LAB', 'SEMINAR'],
                      example: 'LECTURE',
                    },
                    sessionsPerWeek: { type: 'number', example: 2 },
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
      description: 'Teacher not found or user is not an admin',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Teacher not found' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid request data',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Invalid request data' },
        },
      },
    }),
  );
};

export const DeleteTeacherDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Delete teacher (admin only)',
      description:
        'Remove a teacher from the system. This operation unassigns all courses from the teacher. Only admins can delete teachers.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: 'Teacher ID (UUID)',
      example: 'uuid-string',
      type: 'string',
    }),
    ApiOkResponse({
      description: 'Teacher deleted successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Teacher deleted successfully',
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
      description: 'Teacher not found or user is not an admin',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Teacher not found' },
        },
      },
    }),
  );
};
