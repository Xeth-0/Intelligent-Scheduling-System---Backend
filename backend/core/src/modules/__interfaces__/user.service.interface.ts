import {
  type CreateUserDto,
  type UpdateUserDto,
  type UserResponseDto,
} from '../users/dtos';
import { type User } from '@prisma/client';

export interface IUsersService {
  deleteUser(adminId: string, userId: string): Promise<void>;
  findAllUsers(): Promise<UserResponseDto[]>;
  findByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<UserResponseDto>;
  createUser(createUserDto: CreateUserDto): Promise<UserResponseDto>;
  updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto>;
}
