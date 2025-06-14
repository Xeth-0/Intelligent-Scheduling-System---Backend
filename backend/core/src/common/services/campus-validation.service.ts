import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class CampusValidationService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Gets the campus ID for a user based on their role
   * @param userId - ID of the user
   * @returns Promise with campus ID
   */
  async getCampusIdForUser(userId: string): Promise<string> {
    const user = await this.prismaService.user.findFirst({
      where: { userId },
      include: {
        admin: true,
        student: {
          include: {
            studentGroup: {
              include: {
                department: true,
              },
            },
          },
        },
        teacher: {
          include: {
            department: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let campusId: string | undefined = undefined;

    if (user.role === Role.ADMIN && user.admin) {
      campusId = user.admin.campusId;
    } else if (user.role === Role.TEACHER && user.teacher) {
      campusId = user.teacher.department.campusId;
    } else if (user.role === Role.STUDENT && user.student?.studentGroup) {
      campusId = user.student.studentGroup.department.campusId;
    }

    if (!campusId) {
      throw new UnauthorizedException('User is not associated with any campus');
    }

    return campusId;
  }

  /**
   * Validates that an entity belongs to the user's campus
   * @param userId - ID of the user
   * @param entityCampusId - Campus ID of the entity being accessed
   */
  async validateCampusAccess(
    userId: string,
    entityCampusId: string,
  ): Promise<void> {
    const userCampusId = await this.getCampusIdForUser(userId);

    if (userCampusId !== entityCampusId) {
      throw new ForbiddenException('You do not have access to this resource');
    }
  }
}
