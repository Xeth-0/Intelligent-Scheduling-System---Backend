import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, Department } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentResponseDto,
} from './dtos';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly campusValidationService: CampusValidationService,
  ) {}

  /**
   * Maps a department entity to response DTO
   */
  private mapToResponse(
    department: Department & {
      campus: {
        name: string;
      };
    },
  ): DepartmentResponseDto {
    return {
      deptId: department.deptId,
      name: department.name,
      campusId: department.campusId,
      campus: department.campus,
    };
  }

  /**
   * Creates a new department
   */
  async createDepartment(
    userId: string,
    createDepartmentDto: CreateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    try {
      // Validate campus access
      await this.campusValidationService.validateCampusAccess(
        userId,
        createDepartmentDto.campusId,
      );

      const department = await this.prismaService.department.create({
        data: createDepartmentDto,
        include: {
          campus: {
            select: {
              name: true,
            },
          },
        },
      });

      return this.mapToResponse(department);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Department name already exists in this campus',
          );
        } else if (error.code === 'P2025') {
          throw new NotFoundException(
            error.meta?.cause || 'Related entity not found',
          );
        }
      }
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Finds all departments for the user's campus
   */
  async findAllDepartments(userId: string): Promise<DepartmentResponseDto[]> {
    const userCampusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    const departments = await this.prismaService.department.findMany({
      where: {
        campusId: userCampusId,
      },
      include: {
        campus: {
          select: {
            name: true,
          },
        },
      },
    });

    return departments.map((department) => this.mapToResponse(department));
  }

  /**
   * Finds a department by ID with campus validation
   */
  async findDepartmentById(
    userId: string,
    deptId: string,
  ): Promise<DepartmentResponseDto> {
    const department = await this.prismaService.department.findUnique({
      where: { deptId },
      include: {
        campus: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    // Validate campus access
    await this.campusValidationService.validateCampusAccess(
      userId,
      department.campusId,
    );

    return this.mapToResponse(department);
  }

  /**
   * Updates a department
   */
  async updateDepartment(
    userId: string,
    deptId: string,
    updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<DepartmentResponseDto> {
    try {
      // First validate the department exists and campus access
      await this.findDepartmentById(userId, deptId);

      const department = await this.prismaService.department.update({
        where: { deptId },
        data: updateDepartmentDto,
        include: {
          campus: {
            select: {
              name: true,
            },
          },
        },
      });

      return this.mapToResponse(department);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Department name already exists in this campus',
          );
        } else if (error.code === 'P2025') {
          throw new NotFoundException('Department not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Deletes a department
   */
  async deleteDepartment(userId: string, deptId: string): Promise<void> {
    try {
      // First validate the department exists and campus access
      await this.findDepartmentById(userId, deptId);

      await this.prismaService.department.delete({
        where: { deptId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Department not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
