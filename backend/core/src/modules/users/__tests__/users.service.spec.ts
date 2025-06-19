import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Role } from '@prisma/client';
import { NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockUser = {
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    phone: '1234567890',
    needWheelchairAccessibleRoom: false,
    role: Role.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    admin: {
      findFirst: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create a user successfully', async () => {
      const adminId = 'admin-1';
      const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'password123',
        role: Role.STUDENT,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await service.createUser(adminId, createUserDto);

      expect(result).toBeDefined();
      expect(result.email).toBe(createUserDto.email);
    });

    it('should throw ConflictException for duplicate email', async () => {
      const adminId = 'admin-1';
      const createUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        password: 'password123',
        role: Role.STUDENT,
      };

      const error = { code: 'P2002' };
      mockPrismaService.user.create.mockRejectedValue(error);

      await expect(service.createUser(adminId, createUserDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findUserById', () => {
    it('should return a user by id', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findUserById('1');

      expect(result).toBeDefined();
      expect(result.userId).toBe('1');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findUserById('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('should update a user successfully', async () => {
      const updateUserDto = { firstName: 'Jane' };
      const updatedUser = { ...mockUser, firstName: 'Jane' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('1', updateUserDto);

      expect(result.firstName).toBe('Jane');
    });
  });

  describe('deleteUser', () => {
    it('should delete a user successfully', async () => {
      const adminId = 'admin-1';
      const userId = '2';

      mockPrismaService.admin.findFirst.mockResolvedValue({ adminId, userId: adminId });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.delete.mockResolvedValue(mockUser);

      await service.deleteUser(adminId, userId);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should throw ForbiddenException when admin tries to delete themselves', async () => {
      const adminId = 'admin-1';
      const userId = 'admin-1';

      await expect(service.deleteUser(adminId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });
});

