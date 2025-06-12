import {
  PaginatedResponse,
  PaginationData,
} from '@/common/response/api-response.dto';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, StudentGroup } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import {
  CreateStudentGroupDto,
  UpdateStudentGroupDto,
  StudentGroupResponseDto,
} from './dtos';

@Injectable()
export class StudentGroupsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly campusValidationService: CampusValidationService,
  ) {}

  /**
   * Maps a student group entity to response DTO
   */
  private mapToResponse(
    studentGroup: StudentGroup & {
      department: {
        name: string;
        campusId: string;
      };
    } & {
      students?: {
        studentId: string;
        userId: string;
      }[];
    },
  ): StudentGroupResponseDto {
    return {
      studentGroupId: studentGroup.studentGroupId,
      name: studentGroup.name,
      size: studentGroup.size,
      accessibilityRequirement: studentGroup.accessibilityRequirement,
      departmentId: studentGroup.departmentId,
      department: studentGroup.department,
      students: studentGroup.students,
    };
  }

  /**
   * Creates a new student group
   */
  async createStudentGroup(
    userId: string,
    createStudentGroupDto: CreateStudentGroupDto,
  ): Promise<StudentGroupResponseDto> {
    try {
      // Validate department exists and get its campus
      const department = await this.prismaService.department.findUnique({
        where: { deptId: createStudentGroupDto.departmentId },
      });

      if (!department) {
        throw new NotFoundException('Department not found');
      }

      // Validate campus access
      await this.campusValidationService.validateCampusAccess(
        userId,
        department.campusId,
      );

      const studentGroup = await this.prismaService.studentGroup.create({
        data: createStudentGroupDto,
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
            },
          },
        },
      });

      return this.mapToResponse(studentGroup);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Student group name already exists in this department',
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
   * Finds all student groups for the user's campus
   */
  async findAllStudentGroups(
    userId: string,
    page: number,
    size: number,
  ): Promise<PaginatedResponse<StudentGroupResponseDto>> {
    const userCampusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    const skip = (page - 1) * size;
    const [items, totalItems] = await Promise.all([
      this.prismaService.studentGroup.findMany({
        where: {
          department: {
            campusId: userCampusId,
          },
        },
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
            },
          },
          students: {
            select: {
              studentId: true,
              userId: true,
            },
          },
        },
        skip: skip,
        take: size,
        orderBy: [{ name: 'asc' }],
      }),

      this.prismaService.studentGroup.count({
        where: {
          department: {
            campusId: userCampusId,
          },
        },
      }),
    ]);

    const itemDtos = items.map((item) => this.mapToResponse(item));
    const totalPages = Math.ceil(totalItems / size);
    const paginationData: PaginationData = {
      totalItems: totalItems,
      currentPage: page,
      totalPages: totalPages,
      itemsPerPage: size,
    };

    return new PaginatedResponse<StudentGroupResponseDto>(
      itemDtos,
      paginationData,
    );
  }

  /**
   * Finds a student group by ID with campus validation
   */
  async findStudentGroupById(
    userId: string,
    studentGroupId: string,
  ): Promise<StudentGroupResponseDto> {
    const studentGroup = await this.prismaService.studentGroup.findUnique({
      where: { studentGroupId },
      include: {
        department: {
          select: {
            name: true,
            campusId: true,
          },
        },
      },
    });

    if (!studentGroup) {
      throw new NotFoundException('Student group not found');
    }

    // Validate campus access
    await this.campusValidationService.validateCampusAccess(
      userId,
      studentGroup.department.campusId,
    );

    return this.mapToResponse(studentGroup);
  }

  /**
   * Updates a student group
   */
  async updateStudentGroup(
    userId: string,
    studentGroupId: string,
    updateStudentGroupDto: UpdateStudentGroupDto,
  ): Promise<StudentGroupResponseDto> {
    try {
      // First validate the student group exists and campus access
      await this.findStudentGroupById(userId, studentGroupId);

      // If updating department, validate new department
      if (updateStudentGroupDto.departmentId) {
        const department = await this.prismaService.department.findUnique({
          where: { deptId: updateStudentGroupDto.departmentId },
        });

        if (!department) {
          throw new NotFoundException('Department not found');
        }

        // Validate campus access for new department
        await this.campusValidationService.validateCampusAccess(
          userId,
          department.campusId,
        );
      }

      const studentGroup = await this.prismaService.studentGroup.update({
        where: { studentGroupId },
        data: updateStudentGroupDto,
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
            },
          },
        },
      });

      return this.mapToResponse(studentGroup);
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
            'Student group name already exists in this department',
          );
        } else if (error.code === 'P2025') {
          throw new NotFoundException('Student group not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Deletes a student group
   */
  async deleteStudentGroup(
    userId: string,
    studentGroupId: string,
  ): Promise<void> {
    try {
      // First validate the student group exists and campus access
      await this.findStudentGroupById(userId, studentGroupId);

      await this.prismaService.studentGroup.delete({
        where: { studentGroupId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Student group not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
