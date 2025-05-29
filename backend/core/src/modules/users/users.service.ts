import * as bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { IUsersService } from '@/modules/__interfaces__/user.service.interface';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dtos';

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
    const { password, ...rest } = createUserDto;
    console.log('createUserDto: ', createUserDto);
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
        },
      });

      console.log('user created: ', user);
      return this.mapToResponse(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`User with this email already exists`);
        } else if (error.code === 'P2025') {
          throw new NotFoundException(error.meta?.cause || 'User not found');
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

  async isFirstUser(): Promise<boolean> {
    const count = await this.prismaService.user.count();
    return count === 0;
  }

  async findAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.prismaService.user.findMany();
    return users.map((user) => this.mapToResponse(user));
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
          throw new NotFoundException(error.meta?.cause || 'User not found');
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
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException(`User with this email already exists`);
        } else if (error.code === 'P2025') {
          throw new NotFoundException(error.meta?.cause || 'User not found');
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

  async findByEmail(email: string) {
    return this.prismaService.user.findUnique({ where: { email } });
  }
}
