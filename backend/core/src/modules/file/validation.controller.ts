import {
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ValidationService } from './validation.service';
import { RabbitDto, ValidatedDataType } from './dtos/validation-result.dto';
import { ApiResponse } from '@/common/response/api-response.dto';
import { TaskDetailDto, TaskDto } from './dtos/task.dto';
import {
  GetAllTasks,
  GetTaskById,
} from '@/common/decorators/swagger/file.swagger.docs';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { Roles } from '@/common/decorators/auth';
import { Role } from '@prisma/client';

@Controller('validation')
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @EventPattern('csv_validation_response')
  async handleValidationResponse(
    @Payload() payload: RabbitDto<ValidatedDataType[]>,
    @Ctx() context: RmqContext,
  ): Promise<void> {
    return await this.validationService.handleValidationResult(
      payload,
      context,
    );
  }

  @GetAllTasks()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('status')
  @Roles(Role.ADMIN)
  async getAllTasks(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('size', new DefaultValuePipe(10), ParseIntPipe) size: number,
  ): Promise<ApiResponse<TaskDto[]>> {
    const response = await this.validationService.getAllTasks(page, size);
    return ApiResponse.success(
      200,
      response.data,
      'All tasks fetched successfully',
      response.pagination,
    );
  }

  @GetTaskById()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('status/:taskId')
  @Roles(Role.ADMIN)
  async getTaskById(
    @Param('taskId') taskId: string,
  ): Promise<ApiResponse<TaskDetailDto>> {
    const response = await this.validationService.getTaskById(taskId);
    return ApiResponse.success(
      200,
      response,
      'Task detail fetched successfully',
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':taskId')
  @Roles(Role.ADMIN)
  async deleteTask(
    @Param('taskId') taskId: string,
  ): Promise<ApiResponse<TaskDto>> {
    const task = await this.validationService.deleteTaskById(taskId);
    return ApiResponse.success(200, task, 'Task deleted successfully');
  }
}
