import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, Role, Teacher } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { CreateTeacherDto, UpdateTeacherDto, TeacherResponseDto } from './dtos';

@Injectable()
export class TeachersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly campusValidationService: CampusValidationService,
  ) {}

  /**
   * Maps a teacher entity to response DTO
   */
  private mapToResponse(
    teacher: Teacher & {
      user: {
        firstName: string;
        lastName: string;
        email: string;
      };
      department: {
        name: string;
        campusId: string;
      };
    },
  ): TeacherResponseDto {
    return {
      teacherId: teacher.teacherId,
      userId: teacher.userId,
      departmentId: teacher.departmentId,
      user: teacher.user,
      department: teacher.department,
    };
  }

  /**
   * Creates a new teacher
   */
  async createTeacher(
    userId: string,
    createTeacherDto: CreateTeacherDto,
  ): Promise<TeacherResponseDto> {
    try {
      const department = await this.prismaService.department.findUnique({
        where: { deptId: createTeacherDto.departmentId },
      });
      if (!department) {
        throw new NotFoundException('Department not found');
      }
      await this.campusValidationService.validateCampusAccess(
        userId,
        department.campusId,
      );

      const user = await this.prismaService.user.findUnique({
        where: { userId: createTeacherDto.userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      } else if (user.role !== Role.TEACHER) {
        throw new ConflictException('User must have TEACHER role');
      }
      const teacher = await this.prismaService.teacher.create({
        data: createTeacherDto,
        include: {
          user: true,
          department: true,
        },
      });

      return this.mapToResponse(teacher);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Teacher already exists for this user');
        } else if (error.code === 'P2025') {
          throw new NotFoundException(
            error.meta?.cause ?? 'Related entity not found',
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
   * Finds all teachers for the user's campus
   */
  async findAllTeachers(userId: string): Promise<TeacherResponseDto[]> {
    const userCampusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    const teachers = await this.prismaService.teacher.findMany({
      where: {
        department: {
          campusId: userCampusId,
        },
      },
      include: {
        user: true,
        department: true,
      },
    });

    return teachers.map((teacher) => this.mapToResponse(teacher));
  }

  /**
   * Finds a teacher by ID with campus validation
   */
  async findTeacherById(
    userId: string,
    teacherId: string,
  ): Promise<TeacherResponseDto> {
    const teacher = await this.prismaService.teacher.findUnique({
      where: { teacherId },
      include: {
        user: true,
        department: true,
      },
    });

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Validate campus access
    await this.campusValidationService.validateCampusAccess(
      userId,
      teacher.department.campusId,
    );

    return this.mapToResponse(teacher);
  }

  /**
   * Updates a teacher
   */
  async updateTeacher(
    userId: string,
    teacherId: string,
    updateTeacherDto: UpdateTeacherDto,
  ): Promise<TeacherResponseDto> {
    try {
      await this.findTeacherById(userId, teacherId);

      // If updating department, validate new department
      if (updateTeacherDto.departmentId) {
        const department = await this.prismaService.department.findUnique({
          where: { deptId: updateTeacherDto.departmentId },
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

      const teacher = await this.prismaService.teacher.update({
        where: { teacherId },
        data: updateTeacherDto,
        include: {
          user: true,
          department: true,
        },
      });

      return this.mapToResponse(teacher);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Teacher not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Deletes a teacher
   */
  async deleteTeacher(userId: string, teacherId: string): Promise<void> {
    try {
      // First validate the teacher exists and campus access
      await this.findTeacherById(userId, teacherId);

      await this.prismaService.teacher.delete({
        where: { teacherId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Teacher not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
