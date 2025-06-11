import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
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
import { ValidationQueuedDto } from '@/modules/file/dtos/validation-queued.dto';
import { TaskDetailDto, TaskDto } from '@/modules/file/dtos/task.dto';

export const UploadFileDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Upload CSV file' }),
    ApiOkResponse({
      description: 'Upload CSV file to be Verified',
      type: ValidationQueuedDto,
    }),
  );
};

export const GetAllTasks = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get all validation tasks' }),
    ApiResponse({
      status: 200,
      description: 'Get all validation tasks queued by the current user',
      type: [TaskDto],
    }),
  );
};

export const GetTaskById = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Get queued task by ID' }),
    ApiResponse({
      status: 200,
      description: 'Get task details by ID',
      type: TaskDetailDto,
    }),
    ApiParam({ name: 'taskId', description: 'Task ID' }),
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
