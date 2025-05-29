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
import { UserResponseDto, CreateUserDto, UpdateUserDto } from '../../../modules/users/dtos';

export const UploadFieDocs = () => {
  return applyDecorators(
    ApiOperation({ summary: 'Upload CSV file' }),
    ApiOkResponse({
      description: 'Upload CSV file to be Verified',
      type: UserResponseDto,
    })
  );
};
