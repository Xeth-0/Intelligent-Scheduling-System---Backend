import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { IUsersService } from '@/modules/__interfaces__/user.service.interface';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dtos';
import {
  PaginatedResponse,
  PaginationData,
} from '@/common/response/api-response.dto';

@Injectable()
export class UsersService implements IUsersService {
  constructor(private readonly prismaService: PrismaService) {}

  private mapToResponse(user: User): UserResponseDto {
    return {
      userId: user.userId,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      needWheelchairAccessibleRoom: user.needWheelchairAccessibleRoom,
      phoneNumber: user.phone ?? '',
    };
  }

  async createUser(
    adminId: string,
    createUserDto: CreateUserDto,
  ): Promise<UserResponseDto> {
    const admin = await this.prismaService.admin.findUnique({
      where: {
        userId: adminId,
      },
    });
    if (!admin)
      throw new UnauthorizedException(
        'Creator is not an admin: Admin not found',
      );

    // Validate required fields
    const { password, departmentId, ...rest } = createUserDto;
    if (!createUserDto.role) {
      throw new ConflictException(
        'Error creating a new user: Role is required',
      );
    }
    if (!password) {
      throw new BadRequestException('Password is required');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prismaService.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          ...rest,
          passwordHash,
        },
      });

      if (createUserDto.role === Role.TEACHER) {
        if (!departmentId) {
          throw new BadRequestException(
            'Error creating a new Teacher: Department ID is required',
          );
        }
        const department = await tx.department.findUnique({
          where: { deptId: departmentId },
        });
        if (!department) {
          throw new NotFoundException(
            'Error creating a new Teacher: Department not found',
          );
        }
        await tx.teacher.create({
          data: {
            userId: user.userId,
            departmentId: department.deptId,
          },
        });
      } else if (createUserDto.role === Role.STUDENT) {
        await tx.student.create({
          data: {
            userId: user.userId,
          },
        });
      } else if (createUserDto.role === Role.ADMIN) {
        await tx.admin.create({
          data: {
            userId: user.userId,
            campusId: admin.campusId,
          },
        });
      }
      return user;
    });

    return this.mapToResponse(user);
  }

  async isFirstUser(): Promise<boolean> {
    const count = await this.prismaService.user.count();
    return count === 0;
  }

  async findAllUsers(
    page = 1,
    size = 10,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    // pagination logic
    const skip = (page - 1) * size;
    const [users, totalItems] = await Promise.all([
      this.prismaService.user.findMany({
        skip: skip,
        take: size,
        orderBy: [{ firstName: 'asc' }],
      }),
      this.prismaService.user.count(),
    ]);

    const userDtos = users.map((user) => this.mapToResponse(user));
    const totalPages = Math.ceil(totalItems / size);
    const paginationData: PaginationData = {
      totalItems: totalItems,
      currentPage: page,
      totalPages: totalPages,
      itemsPerPage: size,
    };

    return new PaginatedResponse<UserResponseDto>(userDtos, paginationData);
  }

  async findUserById(id: string): Promise<UserResponseDto> {
    const user = await this.prismaService.user.findUnique({
      where: { userId: id },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.mapToResponse(user);
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      const user = await this.findUserById(id);
      if (!user) throw new NotFoundException('User not found');

      if (updateUserDto.password) {
        updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
      }

      const updatedUser = await this.prismaService.user.update({
        where: { userId: id },
        data: { ...updateUserDto },
      });
      return this.mapToResponse(updatedUser);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`User with this email already exists`);
        } else if (error.code === 'P2025') {
          throw new NotFoundException(error.meta?.cause ?? 'User not found');
        } else {
          throw new InternalServerErrorException(
            'An unexpected error occurred',
          );
        }
      } else {
        throw error;
      }
    }
  }

  async deleteUser(adminId: string, userId: string): Promise<void> {
    const admin = await this.prismaService.admin.findFirst({
      where: {
        userId: adminId,
      },
    });
    if (!admin) throw new NotFoundException('Admin not found');

    const user = await this.findUserById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.role === Role.ADMIN) {
      const adminToDelete = await this.prismaService.admin.findFirst({
        where: {
          userId: userId,
        },
      });

      if (!adminToDelete) throw new NotFoundException('Admin not found');
      if (admin.campusId !== adminToDelete.campusId) {
        throw new ForbiddenException('Cannot delete admin from another campus');
      }
      const campusAdmins = await this.prismaService.admin.findMany({
        where: {
          userId: {
            not: adminId,
          },
          campusId: admin.campusId,
        },
      });

      if (campusAdmins.length === 0) {
        throw new ForbiddenException(
          'Cannot delete last admin for this campus',
        );
      }
    }

    // Delete the user
    await this.prismaService.user.delete({ where: { userId: userId } });
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }
}
