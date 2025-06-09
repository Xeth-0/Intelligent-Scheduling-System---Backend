import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, Course } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import { CreateCourseDto, UpdateCourseDto, CourseResponseDto } from './dtos';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly campusValidationService: CampusValidationService,
  ) {}

  /**
   * Maps a course entity to response DTO
   */
  private mapToResponse(
    course: Course & {
      department?: {
        name: string;
        campusId: string;
      } | null;
    },
  ): CourseResponseDto {
    return {
      courseId: course.courseId,
      name: course.name,
      code: course.code,
      description: course.description,
      departmentId: course.departmentId,
      ectsCredits: course.ectsCredits,
      sessionType: course.sessionType,
      sessionsPerWeek: course.sessionsPerWeek,
      department: course.department,
    };
  }

  /**
   * Creates a new course
   */
  async createCourse(
    userId: string,
    createCourseDto: CreateCourseDto,
  ): Promise<CourseResponseDto> {
    try {
      // If department is specified, validate it exists and campus access
      if (createCourseDto.departmentId) {
        const department = await this.prismaService.department.findUnique({
          where: { deptId: createCourseDto.departmentId },
        });

        if (!department) {
          throw new NotFoundException('Department not found');
        }

        // Validate campus access
        await this.campusValidationService.validateCampusAccess(
          userId,
          department.campusId,
        );
      }

      const course = await this.prismaService.course.create({
        data: createCourseDto,
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
            },
          },
        },
      });

      return this.mapToResponse(course);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Course code already exists');
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
   * Finds all courses for the user's campus
   */
  async findAllCourses(userId: string): Promise<CourseResponseDto[]> {
    const userCampusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    const courses = await this.prismaService.course.findMany({
      where: {
        OR: [
          {
            department: {
              campusId: userCampusId,
            },
          },
          {
            department: null, // Include courses without department
          },
        ],
      },
      include: {
        department: {
          select: {
            name: true,
            campusId: true,
          },
        },
      },
    });

    return courses.map((course) => this.mapToResponse(course));
  }

  /**
   * Finds a course by ID with campus validation
   */
  async findCourseById(
    userId: string,
    courseId: string,
  ): Promise<CourseResponseDto> {
    const course = await this.prismaService.course.findUnique({
      where: { courseId },
      include: {
        department: {
          select: {
            name: true,
            campusId: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Validate campus access if course has department
    if (course.department) {
      await this.campusValidationService.validateCampusAccess(
        userId,
        course.department.campusId,
      );
    }

    return this.mapToResponse(course);
  }

  /**
   * Updates a course
   */
  async updateCourse(
    userId: string,
    courseId: string,
    updateCourseDto: UpdateCourseDto,
  ): Promise<CourseResponseDto> {
    try {
      // First validate the course exists and campus access
      await this.findCourseById(userId, courseId);

      // If updating department, validate new department
      if (updateCourseDto.departmentId) {
        const department = await this.prismaService.department.findUnique({
          where: { deptId: updateCourseDto.departmentId },
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

      const course = await this.prismaService.course.update({
        where: { courseId },
        data: updateCourseDto,
        include: {
          department: {
            select: {
              name: true,
              campusId: true,
            },
          },
        },
      });

      return this.mapToResponse(course);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Course code already exists');
        } else if (error.code === 'P2025') {
          throw new NotFoundException('Course not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Deletes a course
   */
  async deleteCourse(userId: string, courseId: string): Promise<void> {
    try {
      // First validate the course exists and campus access
      await this.findCourseById(userId, courseId);

      await this.prismaService.course.delete({
        where: { courseId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Course not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
