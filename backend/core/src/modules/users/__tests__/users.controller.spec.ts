import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dtos';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { CustomApiResponse } from '../../../common/response/api-response.dto';

jest.mock('../../../common/guards/jwt-auth.guard', () => ({
  JwtAuthGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn().mockResolvedValue(true),
  })),
}));

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUser: UserResponseDto = {
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    role: Role.TEACHER,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRolesGuard = {
    canActivate: jest.fn().mockImplementation(() => true),
  };

  beforeEach(async () => {
    const mockUsersService = {
      createUser: jest.fn(),
      findAllUsers: jest.fn(),
      findUserById: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        JwtAuthGuard,
        {
          provide: RolesGuard,
          useValue: mockRolesGuard,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);
  });

  describe('create', () => {
    it('should create a user with valid admin/teacher role', async () => {
      const createDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'new@example.com',
        password: 'password123',
        role: Role.TEACHER,
      };
      const mockResponse = new CustomApiResponse({
        success: true,
        data: mockUser
      });
      usersService.createUser.mockResolvedValue(mockResponse.data);

      const result = await controller.create(createDto);
      expect(result.data).toEqual(mockUser);
      expect(usersService.createUser).toHaveBeenCalledWith(createDto);
    });

    it('should throw ForbiddenException for invalid role', async () => {
      const createDto: CreateUserDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'student@example.com',
        password: 'password123',
        role: Role.STUDENT,
      };

      await expect(controller.create(createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return array of users', async () => {
      usersService.findAllUsers.mockResolvedValue([mockUser]);

      const result = await controller.findAll();
      expect(result.data).toEqual([mockUser]);
      expect(usersService.findAllUsers).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by ID', async () => {
      usersService.findUserById.mockResolvedValue(mockUser);

      const result = await controller.findOne('1');
      expect(result.data).toEqual(mockUser);
      expect(usersService.findUserById).toHaveBeenCalledWith('1');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      usersService.findUserById.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a user', async () => {
      const updateDto: UpdateUserDto = { firstName: 'Updated' };
      usersService.updateUser.mockResolvedValue({ ...mockUser, ...updateDto });

      const result = await controller.update('1', updateDto);
      expect(result.data.firstName).toBe('Updated');
      expect(usersService.updateUser).toHaveBeenCalledWith('1', updateDto);
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      usersService.deleteUser.mockResolvedValue();

      await controller.remove('2');
      expect(usersService.deleteUser).toHaveBeenCalledWith('2');
    });

    it('should prevent deleting admin users', async () => {
      usersService.deleteUser.mockRejectedValue(new ForbiddenException());

      await expect(controller.remove('1')).rejects.toThrow(ForbiddenException);
    });
  });
});
