import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../dtos';
import { UserResponseDto } from '../dtos/user-response.dto';


// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockUser = {
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    role: Role.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockResponseUser = {
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    role: Role.STUDENT,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        create: jest.fn() as jest.Mock,
        findMany: jest.fn() as jest.Mock,
        findUnique: jest.fn() as jest.Mock,
        update: jest.fn() as jest.Mock,
        delete: jest.fn() as jest.Mock,
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  describe('createUser', () => {
    it('should successfully create a user', async () => {
      const createUserDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'valid-password-123',
        role: Role.ADMIN,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      (prismaService.user.create as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.createUser(createUserDto);

      expect(result).toEqual(mockResponseUser);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          email: createUserDto.email,
          passwordHash: 'hashedPassword',
          role: createUserDto.role,
        }),
        include: {
          department: true,
          classGroup: true,
        },
      });
    });

    it('should throw BadRequestException when password is missing', async () => {
      const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        role: Role.STUDENT,
      } as any;

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'exists@example.com',
        password: 'password123',
        role: Role.STUDENT,
      };

      (prismaService.user.create as jest.Mock).mockRejectedValue({ code: 'P2002' });

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAllUsers', () => {
    it('should return all users', async () => {
      const mockUsers = [mockUser, { ...mockUser, userId: '2' }];
      (prismaService.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await service.findAllUsers();

      expect(result).toEqual(mockUsers.map(user => ({
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })));
    });
  });

  describe('findUserById', () => {
    it('should return a user when found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findUserById('1');

      expect(result).toEqual(mockResponseUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { userId: '1' },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findUserById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('should successfully update a user', async () => {
      const updateUserDto = {
        firstName: 'Jane',
        lastName: 'Doe',
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        ...updateUserDto,
      });

      const result = await service.updateUser('1', updateUserDto);

      expect(result).toEqual({
        ...mockResponseUser,
        ...updateUserDto,
      });
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { userId: '1' },
        data: updateUserDto,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateUser('999', { firstName: 'Jane' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should successfully delete a non-admin user', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.user.delete as jest.Mock).mockResolvedValue(mockUser);

      await service.deleteUser('1');

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { userId: '1' },
      });
    });

    it('should throw ForbiddenException when trying to delete an admin', async () => {
      const adminUser = { ...mockUser, role: Role.ADMIN };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(adminUser);

      await expect(service.deleteUser('1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when user not found', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteUser('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found by email', async () => {
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });
});
