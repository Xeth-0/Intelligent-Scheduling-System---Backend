import { Controller, Delete, Get, Param } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ValidationService } from './validation.service';
import { RabbitDto, ValidatedDataType } from './dtos/validation-result.dto';
import { ApiResponse } from '@/common/response/api-response.dto';
import { TaskDetailDto, TaskDto } from './dtos/task.dto';
import {
  GetAllTasks,
  GetTaskById,
} from '@/common/decorators/swagger/file.swagger.docs';

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
  @Get('status')
  async getAllTasks(): Promise<ApiResponse<TaskDto[]>> {
    const response = new ApiResponse<TaskDto[]>({
      success: true,
      message: 'All tasks',
      data: await this.validationService.getAllTasks(),
    });
    return response;
  }
  @GetTaskById()
  @Get('status/:taskId')
  async getTaskById(
    @Param('taskId') taskId: string,
  ): Promise<ApiResponse<TaskDetailDto>> {
    const response = await this.validationService.getTaskById(taskId);

    console.log(response);
    return new ApiResponse<TaskDetailDto>({
      success: true,
      message: 'Task detail',
      data: response,
    });
  }

  @Delete(':taskId')
  async deleteTask(
    @Param('taskId') taskId: string,
  ): Promise<ApiResponse<TaskDto>> {
    const task = await this.validationService.deleteTaskById(taskId);
    return new ApiResponse<TaskDto>({
      success: true,
      message: 'Task deleted',
      data: task,
    });
  }
}
