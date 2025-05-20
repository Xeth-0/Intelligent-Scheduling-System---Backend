import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
} from '@nestjs/swagger';

import {
  GeneralScheduleWrapperDto,
  TeacherScheduleWrapperDto,
} from '../../../modules/scheduling/dtos';
export const GetGeneralScheduleDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get General format Schedule' }),
    ApiOkResponse({
      description: 'General Schedule Format',
      type: GeneralScheduleWrapperDto,
      example: {
        schedule: {
          class1: {
            1: { teacherId: 'T001', subjectId: 'S001', classroomId: 'C001' },
            2: { teacherId: 'T002', subjectId: 'S002', classroomId: 'C002' },
          },
          class2: {
            3: { teacherId: 'T003', subjectId: 'S003', classroomId: 'C003' },
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
    ApiOperation({ summary: 'Get Teacher format Schedule' }),
    ApiCreatedResponse({
      description: 'Teacher Schedule Format',
      type: TeacherScheduleWrapperDto,
      example: {
        T001: {
          '1': {
            classGroupId: 'class1',
            subjectId: 'S001',
            classroomId: 'C001',
          },
          '6': {
            classGroupId: 'class4',
            subjectId: 'S004',
            classroomId: 'C001',
          },
        },
        T002: {
          '2': {
            classGroupId: 'class2',
            subjectId: 'S002',
            classroomId: 'C002',
          },
        },
      },
    }),
    ApiParam({ name: 'teacherId', description: 'teacher ID', required: false }),
  );
};
// export const GetUserByIdDocs = () => {
//   return applyDecorators(
//     ApiOperation({ summary: 'Get user by ID' }),
//     ApiOkResponse({
//       description: 'User details',
//       type: UserResponseDto,
//     }),
//     ApiParam({ name: 'id', description: 'User ID' }),
//   );
// };

// export const GetGeneralScheduleDocs = () => {
//   return applyDecorators(
//     ApiOperation({ summary: 'Get General format Schedule' }),
//     ApiOkResponse({
//       description: 'General Schedule Format',
//       type: GeneralScheduleWrapperDto,
//     }),
//   );
// };

// export const UpdateUserDocs = () => {
//   return applyDecorators(
//     ApiOperation({ summary: 'Update user (admin only)' }),
//     ApiOkResponse({
//       description: 'User updated successfully',
//       type: UserResponseDto,
//     }),
//     ApiParam({ name: 'id', description: 'User ID' }),
//     ApiBody({ type: UpdateUserDto }),
//   );
// };

// export const DeleteUserDocs = () => {
//   return applyDecorators(
//     ApiOperation({ summary: 'Delete user (admin only)' }),
//     ApiOkResponse({ description: 'User deleted successfully' }),
//     ApiParam({ name: 'id', description: 'User ID' }),
//   );
// };

