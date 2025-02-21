import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { IUsersService } from '../.interfaces/user.service.interface';
import { Role, User } from '@prisma/client';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dtos';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

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
    };
  }

  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { departmentId, classGroupId, password, ...rest } = createUserDto;
    // Validate required fields
    if (!rest.role) {
      throw new ConflictException('Role is required');
    }

    try {
      let passwordHash: string;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      } else {
        throw new BadRequestException('Password is required');
      }

      const user = await this.prismaService.user.create({
        data: {
          ...rest,
          passwordHash,
          department: departmentId
            ? { connect: { deptId: departmentId } }
            : undefined,
          classGroup: classGroupId ? { connect: { classGroupId } } : undefined,
        },
        include: {
          department: true,
          classGroup: true,
        },
      });

      return this.mapToResponse(user);
    } catch (error) {
      this.handlePrismaError(error, 'User');
    }
  }

  async isFirstUser(): Promise<boolean> {
    const count = await this.prismaService.user.count();
    return count === 0;
  }

  private handlePrismaError(error: any, entity: string): never {
    // Rethrow HttpExceptions (like BadRequest/Forbidden)
    if (error instanceof HttpException) {
      throw error;
    }

    if (error.code === 'P2002') {
      throw new ConflictException(`${entity} with this email already exists`);
    }
    if (error.code === 'P2025') {
      throw new NotFoundException(error.meta?.cause || `${entity} not found`);
    }

    throw new InternalServerErrorException('An unexpected error occurred');
  }

  async findAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.prismaService.user.findMany();
    return users.map(this.mapToResponse);
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

      const updatedUser = await this.prismaService.user.update({
        where: { userId: id },
        data: { ...updateUserDto },
      });
      return this.mapToResponse(updatedUser);
    } catch (error) {
      this.handlePrismaError(error, 'User');
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      // Check if the user exists
      const user = await this.findUserById(id);
      if (!user) throw new NotFoundException('User not found');

      // Check if the user is an admin
      if (user.role === Role.ADMIN) {
        throw new ForbiddenException('Admins cannot be deleted');
      }

      // Delete the user
      await this.prismaService.user.delete({ where: { userId: id } });
    } catch (error) {
      this.handlePrismaError(error, 'User');
    }
  }

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }
}
