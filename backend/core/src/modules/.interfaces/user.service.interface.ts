import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../users/dtos';
import { User } from '@prisma/client';

export interface IUsersService {
  deleteUser(id: string): Promise<void>;
  findAllUsers(): Promise<UserResponseDto[]>;
  findByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<UserResponseDto>;
  createUser(createUserDto: CreateUserDto): Promise<UserResponseDto>;
  updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto>;
}
