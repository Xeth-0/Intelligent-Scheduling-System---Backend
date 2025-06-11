import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchSessionsBody } from '@/modules/scheduling/dtos/scheduleSearch.dto';

export const GenerateScheduleDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Generate a new schedule (admin only)',
      description:
        'Generate a new optimized schedule for the campus using the scheduling algorithm. Only admins can trigger schedule generation.',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'scheduleName',
      description: 'Schedule name',
      example: 'Unnamed Schedule',
      type: 'string',
      required: false,
    }),
    ApiCreatedResponse({
      description: 'Schedule generated successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 201 },
          message: {
            type: 'string',
            example: 'Schedule generated successfully',
          },
          data: {
            type: 'object',
            properties: {
              scheduleId: { type: 'string', example: 'uuid-string' },
              scheduleName: { type: 'string', example: 'Unnamed Schedule' },
              isActive: { type: 'boolean', example: false },
              sessions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    scheduleId: { type: 'string', example: 'uuid-string' },
                    courseId: { type: 'string', example: 'COURSE001' },
                    courseName: { type: 'string', example: 'Mathematics 101' },
                    teacherId: { type: 'string', example: 'TEACHER001' },
                    teacherName: { type: 'string', example: 'Dr. John Smith' },
                    classroomId: { type: 'string', example: 'ROOM001' },
                    classroomName: { type: 'string', example: 'Room 101' },
                    classGroupIds: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['GROUP001', 'GROUP002'],
                    },
                    sessionType: {
                      type: 'string',
                      enum: ['LECTURE', 'LAB', 'TUTORIAL', 'SEMINAR'],
                    },
                    timeslot: { type: 'string', example: '08:00-09:30' },
                    day: {
                      type: 'string',
                      enum: [
                        'MONDAY',
                        'TUESDAY',
                        'WEDNESDAY',
                        'THURSDAY',
                        'FRIDAY',
                      ],
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
    ApiBadRequestResponse({
      description:
        'Schedule generation failed due to constraints or data issues',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Schedule generation failed' },
        },
      },
    }),
  );
};

export const GetScheduleByIdDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get schedule by ID',
      description:
        'Retrieve a specific schedule by its ID. Access is restricted based on user role and schedule status.',
    }),
    ApiBearerAuth(),
    ApiQuery({
      name: 'scheduleId',
      description: 'Schedule ID (UUID)',
      example: 'uuid-string',
      type: 'string',
    }),
    ApiOkResponse({
      description: 'Schedule retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Schedule retrieved successfully',
          },
          data: {
            type: 'object',
            properties: {
              scheduleId: { type: 'string', example: 'uuid-string' },
              scheduleName: { type: 'string', example: 'Unnamed Schedule' },
              isActive: { type: 'boolean', example: false },
              sessions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    scheduleId: { type: 'string', example: 'uuid-string' },
                    courseId: { type: 'string', example: 'COURSE001' },
                    courseName: { type: 'string', example: 'Mathematics 101' },
                    teacherId: { type: 'string', example: 'TEACHER001' },
                    teacherName: { type: 'string', example: 'Dr. John Smith' },
                    classroomId: { type: 'string', example: 'ROOM001' },
                    classroomName: { type: 'string', example: 'Room 101' },
                    classGroupIds: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['GROUP001', 'GROUP002'],
                    },
                    sessionType: {
                      type: 'string',
                      enum: ['LECTURE', 'LAB', 'TUTORIAL', 'SEMINAR'],
                    },
                    timeslot: { type: 'string', example: '08:00-09:30' },
                    day: {
                      type: 'string',
                      enum: [
                        'MONDAY',
                        'TUESDAY',
                        'WEDNESDAY',
                        'THURSDAY',
                        'FRIDAY',
                      ],
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
    ApiForbiddenResponse({
      description: 'Insufficient permissions to access this schedule',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 403 },
          message: {
            type: 'string',
            example: 'You do not have permission to access this schedule',
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Schedule not found with the provided ID',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Schedule not found' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid schedule ID format',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Invalid schedule ID format' },
        },
      },
    }),
  );
};

export const GetAllSchedulesDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Get all schedules for campus (admin only)',
      description:
        "Retrieve all schedules for the admin's campus. Only admins can access this endpoint.",
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Schedules retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Schedules retrieved successfully',
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                scheduleId: { type: 'string', example: 'uuid-string' },
                scheduleName: { type: 'string', example: 'Unnamed Schedule' },
                isActive: { type: 'boolean', example: false },
                sessions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      scheduleId: { type: 'string', example: 'uuid-string' },
                      courseId: { type: 'string', example: 'COURSE001' },
                      courseName: {
                        type: 'string',
                        example: 'Mathematics 101',
                      },
                      teacherId: { type: 'string', example: 'TEACHER001' },
                      teacherName: {
                        type: 'string',
                        example: 'Dr. John Smith',
                      },
                      classroomId: { type: 'string', example: 'ROOM001' },
                      classroomName: { type: 'string', example: 'Room 101' },
                      classGroupIds: {
                        type: 'array',
                        items: { type: 'string' },
                        example: ['GROUP001', 'GROUP002'],
                      },
                      sessionType: {
                        type: 'string',
                        enum: ['LECTURE', 'LAB', 'TUTORIAL', 'SEMINAR'],
                      },
                      timeslot: { type: 'string', example: '08:00-09:30' },
                      day: {
                        type: 'string',
                        enum: [
                          'MONDAY',
                          'TUESDAY',
                          'WEDNESDAY',
                          'THURSDAY',
                          'FRIDAY',
                        ],
                      },
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

export const ActivateScheduleDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Activate a schedule (admin only)',
      description:
        'Activate a specific schedule making it the current active schedule for the campus. Deactivates any previously active schedule.',
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'scheduleId',
      description: 'Schedule ID (UUID)',
      example: 'uuid-string',
      type: 'string',
    }),
    ApiOkResponse({
      description: 'Schedule activated successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Schedule activated successfully',
          },
          data: {
            type: 'object',
            properties: {
              scheduleId: { type: 'string', example: 'uuid-string' },
              scheduleName: { type: 'string', example: 'Unnamed Schedule' },
              isActive: { type: 'boolean', example: false },
              sessions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    scheduleId: { type: 'string', example: 'uuid-string' },
                    courseId: { type: 'string', example: 'COURSE001' },
                    courseName: { type: 'string', example: 'Mathematics 101' },
                    teacherId: { type: 'string', example: 'TEACHER001' },
                    teacherName: { type: 'string', example: 'Dr. John Smith' },
                    classroomId: { type: 'string', example: 'ROOM001' },
                    classroomName: { type: 'string', example: 'Room 101' },
                    classGroupIds: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['GROUP001', 'GROUP002'],
                    },
                    sessionType: {
                      type: 'string',
                      enum: ['LECTURE', 'LAB', 'TUTORIAL', 'SEMINAR'],
                    },
                    timeslot: { type: 'string', example: '08:00-09:30' },
                    day: {
                      type: 'string',
                      enum: [
                        'MONDAY',
                        'TUESDAY',
                        'WEDNESDAY',
                        'THURSDAY',
                        'FRIDAY',
                      ],
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
      description: 'Schedule not found with the provided ID',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Schedule not found' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid schedule ID format or schedule cannot be activated',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 400 },
          message: { type: 'string', example: 'Invalid schedule ID format' },
        },
      },
    }),
  );
};

export const SearchSessionsDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: 'Search for sessions',
      description:
        'Search for specific sessions within a schedule using various filters like teacher, course, classroom, day, etc.',
    }),
    ApiBearerAuth(),
    ApiBody({
      type: SearchSessionsBody,
      description: 'Search criteria for filtering sessions',
      examples: {
        byTeacher: {
          summary: 'Search by teacher',
          value: {
            scheduleId: 'uuid-string',
            teacherId: 'TEACHER001',
          },
        },
        byCourse: {
          summary: 'Search by course',
          value: {
            scheduleId: 'uuid-string',
            courseId: 'COURSE001',
            courseName: 'Mathematics',
          },
        },
        byClassroom: {
          summary: 'Search by classroom',
          value: {
            scheduleId: 'uuid-string',
            classroomId: 'ROOM001',
            classroomName: 'Lab 101',
          },
        },
        byDay: {
          summary: 'Search by day',
          value: {
            scheduleId: 'uuid-string',
            day: 'MONDAY',
          },
        },
        comprehensive: {
          summary: 'Comprehensive search',
          value: {
            scheduleId: 'uuid-string',
            teacherId: 'TEACHER001',
            teacherFirstName: 'John',
            teacherLastName: 'Smith',
            courseId: 'COURSE001',
            courseName: 'Mathematics',
            sessionType: 'LECTURE',
            day: 'MONDAY',
            classroomId: 'ROOM001',
            classroomName: 'Lab 101',
            classroomBuildingId: 'BUILDING001',
            classroomBuildingName: 'Science Building',
            classroomAccessibility: true,
            studentGroupId: 'GROUP001',
            studentGroupName: 'Class 1A',
            studentGroupAccessibility: true,
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Sessions retrieved successfully',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'number', example: 200 },
          message: {
            type: 'string',
            example: 'Sessions retrieved successfully',
          },
          data: {
            type: 'object',
            properties: {
              scheduleId: { type: 'string', example: 'uuid-string' },
              scheduleName: { type: 'string', example: 'Unnamed Schedule' },
              isActive: { type: 'boolean', example: false },
              sessions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    scheduleId: { type: 'string', example: 'uuid-string' },
                    courseId: { type: 'string', example: 'COURSE001' },
                    courseName: { type: 'string', example: 'Mathematics 101' },
                    teacherId: { type: 'string', example: 'TEACHER001' },
                    teacherName: { type: 'string', example: 'Dr. John Smith' },
                    classroomId: { type: 'string', example: 'ROOM001' },
                    classroomName: { type: 'string', example: 'Room 101' },
                    classGroupIds: {
                      type: 'array',
                      items: { type: 'string' },
                      example: ['GROUP001', 'GROUP002'],
                    },
                    sessionType: {
                      type: 'string',
                      enum: ['LECTURE', 'LAB', 'TUTORIAL', 'SEMINAR'],
                    },
                    timeslot: { type: 'string', example: '08:00-09:30' },
                    day: {
                      type: 'string',
                      enum: [
                        'MONDAY',
                        'TUESDAY',
                        'WEDNESDAY',
                        'THURSDAY',
                        'FRIDAY',
                      ],
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
    ApiForbiddenResponse({
      description: 'Insufficient permissions to access this schedule',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 403 },
          message: {
            type: 'string',
            example: 'You do not have permission to access this schedule',
          },
        },
      },
    }),
    ApiNotFoundResponse({
      description: 'Schedule not found with the provided ID',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'number', example: 404 },
          message: { type: 'string', example: 'Schedule not found' },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid search criteria or schedule ID format',
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

// Legacy docs (keeping for backward compatibility but marked as deprecated)
export const GetGeneralScheduleDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '[DEPRECATED] Get General format Schedule',
      description:
        'Legacy endpoint for getting schedule in general format. Use the new endpoints instead.',
      deprecated: true,
    }),
    ApiOkResponse({
      description: 'General Schedule Format',
      schema: {
        type: 'object',
        properties: {
          schedule: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  teacherId: { type: 'string', example: 'T001' },
                  subjectId: { type: 'string', example: 'S001' },
                  classroomId: { type: 'string', example: 'C001' },
                },
              },
            },
          },
        },
      },
    }),
    ApiParam({
      name: 'classGroupId',
      description: 'class ID',
      required: false,
    }),
  );
};

export const GetTeacherScheduleDocs = () => {
  return applyDecorators(
    ApiOperation({
      summary: '[DEPRECATED] Get Teacher format Schedule',
      description:
        'Legacy endpoint for getting schedule in teacher format. Use the new endpoints instead.',
      deprecated: true,
    }),
    ApiCreatedResponse({
      description: 'Teacher Schedule Format',
      schema: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              classGroupId: { type: 'string', example: 'class1' },
              subjectId: { type: 'string', example: 'S001' },
              classroomId: { type: 'string', example: 'C001' },
            },
          },
        },
      },
    }),
    ApiParam({
      name: 'teacherId',
      description: 'teacher ID',
      required: false,
    }),
  );
};
