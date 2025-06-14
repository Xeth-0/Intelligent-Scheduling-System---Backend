import {
  Controller,
  UseInterceptors,
  ClassSerializerInterceptor,
  UseGuards,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerResponse,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { Role, User } from '@prisma/client';
import { Roles } from '@/common/decorators/auth/roles.decorator';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';
import { GetUser } from '@/common/decorators/auth/get-user.decorator';
import { ApiResponse } from '@/common/response/api-response.dto';
import { ConstraintService } from './constraints.service';
import {
  CreateConstraintDto,
  UpdateConstraintDto,
  ConstraintResponseDto,
  ConstraintTypeResponseDto,
} from './dtos';

@Controller('constraints')
@ApiBearerAuth()
@ApiTags('Constraints')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConstraintController {
  constructor(private readonly constraintService: ConstraintService) {}

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Create a new constraint' })
  @SwaggerResponse({
    status: 201,
    description: 'Constraint created successfully',
    type: ConstraintResponseDto,
  })
  async createConstraint(
    @GetUser() user: User,
    @Body() createDto: CreateConstraintDto,
  ) {
    const constraint = await this.constraintService.createConstraint(
      user.userId,
      createDto,
    );

    return ApiResponse.success(
      201,
      plainToInstance(ConstraintResponseDto, constraint),
      'Constraint created successfully',
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get all constraints for the current user' })
  @SwaggerResponse({
    status: 200,
    description: 'Constraints retrieved successfully',
    type: [ConstraintResponseDto],
  })
  async getAllConstraints(@GetUser() user: User) {
    const constraints = await this.constraintService.getAllConstraints(
      user.userId,
    );

    return ApiResponse.success(
      200,
      plainToInstance(ConstraintResponseDto, constraints),
      'Constraints retrieved successfully',
    );
  }

  @Get('types')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Get all available constraint types' })
  @SwaggerResponse({
    status: 200,
    description: 'Constraint types retrieved successfully',
    type: [ConstraintTypeResponseDto],
  })
  async getConstraintTypes() {
    const constraintTypes = await this.constraintService.getConstraintTypes();

    return ApiResponse.success(
      200,
      plainToInstance(ConstraintTypeResponseDto, constraintTypes),
      'Constraint types retrieved successfully',
    );
  }

  @Get('types/campus')
  @Roles(Role.TEACHER)
  @ApiOperation({
    summary: 'Get campus-level constraint types (teachers only)',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Campus constraint types retrieved successfully',
    type: [ConstraintTypeResponseDto],
  })
  async getCampusConstraintTypes(@GetUser() user: User) {
    const constraintTypes =
      await this.constraintService.getCampusConstraintTypes(user.userId);

    return ApiResponse.success(
      200,
      plainToInstance(ConstraintTypeResponseDto, constraintTypes),
      'Campus constraint types retrieved successfully',
    );
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @ApiOperation({ summary: 'Update a constraint' })
  @SwaggerResponse({
    status: 200,
    description: 'Constraint updated successfully',
    type: ConstraintResponseDto,
  })
  async updateConstraint(
    @GetUser() user: User,
    @Param('id') constraintId: string,
    @Body() updateDto: UpdateConstraintDto,
  ) {
    const constraint = await this.constraintService.updateConstraint(
      constraintId,
      user.userId,
      updateDto,
    );

    return ApiResponse.success(
      200,
      plainToInstance(ConstraintResponseDto, constraint),
      'Constraint updated successfully',
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a constraint' })
  @SwaggerResponse({
    status: 204,
    description: 'Constraint deleted successfully',
  })
  async deleteConstraint(
    @GetUser() user: User,
    @Param('id') constraintId: string,
  ) {
    await this.constraintService.deleteConstraint(constraintId, user.userId);

    return ApiResponse.success(204, null, 'Constraint deleted successfully');
  }

  @Patch(':id/toggle')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Toggle constraint active status (admin only)' })
  @SwaggerResponse({
    status: 200,
    description: 'Constraint status toggled successfully',
    type: ConstraintResponseDto,
  })
  async toggleConstraintStatus(
    @GetUser() user: User,
    @Param('id') constraintId: string,
  ) {
    const constraint = await this.constraintService.toggleConstraintStatus(
      constraintId,
      user.userId,
    );

    return ApiResponse.success(
      200,
      plainToInstance(ConstraintResponseDto, constraint),
      'Constraint status toggled successfully',
    );
  }
}
