import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma, Classroom } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CampusValidationService } from '@/common/services/campus-validation.service';
import {
  CreateClassroomDto,
  UpdateClassroomDto,
  ClassroomResponseDto,
} from './dtos';

@Injectable()
export class ClassroomsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly campusValidationService: CampusValidationService,
  ) {}

  /**
   * Maps a classroom entity to response DTO
   */
  private mapToResponse(
    classroom: Classroom & {
      campus: {
        name: string;
      };
      building?: {
        name: string;
      } | null;
    },
  ): ClassroomResponseDto {
    return {
      classroomId: classroom.classroomId,
      name: classroom.name,
      capacity: classroom.capacity,
      type: classroom.type,
      campusId: classroom.campusId,
      buildingId: classroom.buildingId,
      isWheelchairAccessible: classroom.isWheelchairAccessible,
      openingTime: classroom.openingTime,
      closingTime: classroom.closingTime,
      floor: classroom.floor,
      campus: classroom.campus,
      building: classroom.building,
    };
  }

  /**
   * Creates a new classroom
   */
  async createClassroom(
    userId: string,
    createClassroomDto: CreateClassroomDto,
  ): Promise<ClassroomResponseDto> {
    try {
      const admin = await this.prismaService.admin.findFirst({
        where: {
          userId,
        },
      });

      if (!admin) {
        throw new NotFoundException('Admin not found');
      }

      const campusId = admin.campusId;

      // Validate campus access
      await this.campusValidationService.validateCampusAccess(userId, campusId);

      // If building is specified, validate it exists
      if (createClassroomDto.buildingId) {
        const building = await this.prismaService.building.findUnique({
          where: { buildingId: createClassroomDto.buildingId },
        });

        // TODO: check if building is in the same campus
        if (!building) {
          throw new NotFoundException('Building not found');
        }
      }

      const classroom = await this.prismaService.classroom.create({
        data: {
          ...createClassroomDto,
          campusId,
        },
        include: {
          campus: {
            select: {
              name: true,
            },
          },
          building: {
            select: {
              name: true,
            },
          },
        },
      });

      return this.mapToResponse(classroom);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(
            'Classroom name already exists in this campus',
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
   * Finds all classrooms for the user's campus
   */
  async findAllClassrooms(userId: string): Promise<ClassroomResponseDto[]> {
    const userCampusId =
      await this.campusValidationService.getCampusIdForUser(userId);

    const classrooms = await this.prismaService.classroom.findMany({
      where: {
        campusId: userCampusId,
      },
      include: {
        campus: {
          select: {
            name: true,
          },
        },
        building: {
          select: {
            name: true,
          },
        },
      },
    });

    return classrooms.map((classroom) => this.mapToResponse(classroom));
  }

  /**
   * Finds a classroom by ID with campus validation
   */
  async findClassroomById(
    userId: string,
    classroomId: string,
  ): Promise<ClassroomResponseDto> {
    const classroom = await this.prismaService.classroom.findUnique({
      where: { classroomId },
      include: {
        campus: {
          select: {
            name: true,
          },
        },
        building: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('Classroom not found');
    }

    // Validate campus access
    await this.campusValidationService.validateCampusAccess(
      userId,
      classroom.campusId,
    );

    return this.mapToResponse(classroom);
  }

  /**
   * Updates a classroom
   */
  async updateClassroom(
    userId: string,
    classroomId: string,
    updateClassroomDto: UpdateClassroomDto,
  ): Promise<ClassroomResponseDto> {
    try {
      // First validate the classroom exists and campus access
      await this.findClassroomById(userId, classroomId);

      // If updating building, validate new building
      if (updateClassroomDto.buildingId) {
        const building = await this.prismaService.building.findUnique({
          where: { buildingId: updateClassroomDto.buildingId },
        });

        if (!building) {
          throw new NotFoundException('Building not found');
        }
      }

      const classroom = await this.prismaService.classroom.update({
        where: { classroomId },
        data: updateClassroomDto,
        include: {
          campus: {
            select: {
              name: true,
            },
          },
          building: {
            select: {
              name: true,
            },
          },
        },
      });

      return this.mapToResponse(classroom);
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
            'Classroom name already exists in this campus',
          );
        } else if (error.code === 'P2025') {
          throw new NotFoundException('Classroom not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }

  /**
   * Deletes a classroom
   */
  async deleteClassroom(userId: string, classroomId: string): Promise<void> {
    try {
      // First validate the classroom exists and campus access
      await this.findClassroomById(userId, classroomId);

      await this.prismaService.classroom.delete({
        where: { classroomId },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Classroom not found');
        }
      }
      throw new InternalServerErrorException('An unexpected error occurred');
    }
  }
}
