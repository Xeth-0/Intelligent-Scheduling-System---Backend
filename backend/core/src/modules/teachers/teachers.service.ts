import {
  PaginatedResponse,
  PaginationData,
} from '@/common/response/api-response.dto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Course, Department, Teacher, User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { UpdateTeacherDto, TeacherResponseDto } from './dtos';

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
      user: User;
      department: Department;
      courses: Course[];
    },
  ): TeacherResponseDto {
    return {
      teacherId: teacher.teacherId,
      userId: teacher.userId,
      departmentId: teacher.departmentId,
      user: teacher.user,
      department: teacher.department,
      courses: teacher.courses,
    };
  }

  /**
   * Finds all teachers for the user's campus
   */
  async findAllTeachers(
    userId: string,
    page: number,
    size: number,
  ): Promise<PaginatedResponse<TeacherResponseDto>> {
    const userCampusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    const skip = (page - 1) * size;
    const [items, totalItems] = await Promise.all([
      this.prismaService.teacher.findMany({
        where: {
          department: {
            campusId: userCampusId,
          },
        },
        include: {
          user: true,
          department: true,
          courses: true,
        },
        skip: skip,
        take: size,
      }),
      this.prismaService.teacher.count({
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

    return new PaginatedResponse<TeacherResponseDto>(itemDtos, paginationData);
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
        courses: true,
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
    updateTeacherDto: UpdateTeacherDto,
  ): Promise<TeacherResponseDto> {
    const admin = await this.prismaService.admin.findFirst({
      where: {
        userId: userId,
      },
    });
    if (!admin) {
      throw new NotFoundException(
        'Error updating teacher: The user is not an admin',
      );
    }

    const teacher = await this.prismaService.teacher.findUnique({
      where: { teacherId: updateTeacherDto.teacherId },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }

    // Update course's teacherId if courseId is provided
    if (updateTeacherDto.courseId) {
      await this.prismaService.course.update({
        where: { courseId: updateTeacherDto.courseId },
        data: {
          teacherId: updateTeacherDto.teacherId,
        },
      });
    }

    const updatedTeacher = await this.prismaService.teacher.update({
      where: { teacherId: updateTeacherDto.teacherId },
      data: {
        departmentId: updateTeacherDto.departmentId,
      },
      include: {
        user: true,
        department: true,
        courses: true,
      },
    });
    return this.mapToResponse(updatedTeacher);
  }

  /**
   * Deletes a teacher (admin only, removes all courses from the teacher)
   */
  async deleteTeacher(userId: string, teacherId: string): Promise<void> {
    const admin = await this.prismaService.admin.findFirst({
      where: {
        userId: userId,
      },
    });
    if (!admin) {
      throw new NotFoundException('The user is not an admin');
    }

    const courses = await this.prismaService.course.findMany({
      where: {
        teacherId: teacherId,
      },
    });
    for (const course of courses) {
      await this.prismaService.course.update({
        where: { courseId: course.courseId },
        data: {
          teacherId: null,
        },
      });
    }
  }
}
