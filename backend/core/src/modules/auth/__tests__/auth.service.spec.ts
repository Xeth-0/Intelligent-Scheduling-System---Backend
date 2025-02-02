import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { TokensService } from '../tokens.service';
import {
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let tokensService: jest.Mocked<TokensService>;

  const mockUser = {
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    passwordHash: 'hashedPassword',
    role: Role.STUDENT,
    departmentId: null,
    classGroupId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'mockAccessToken',
    refreshToken: 'mockRefreshToken',
  };

  beforeEach(async () => {
    // Create mock services
    const mockUsersService = {
      findByEmail: jest.fn(),
      createUser: jest.fn().mockResolvedValue({
        userId: 'test-id',
        email: 'test@example.com',
        role: Role.STUDENT,
      }),
      findUserById: jest.fn(),
      isFirstUser: jest.fn(),
    };

    const mockTokensService = {
      generateTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
      saveRefreshToken: jest.fn().mockResolvedValue(undefined),
      deleteRefreshToken: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: TokensService, useValue: mockTokensService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    tokensService = module.get(TokensService);
  });

  describe('login', () => {
    it('should successfully login a user with valid credentials', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'password123' };
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tokensService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      // Arrange
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      usersService.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should successfully register a new student user', async () => {
      // Arrange
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.STUDENT,
      };
      usersService.findByEmail.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      usersService.createUser.mockResolvedValue(mockUser);
      tokensService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersService.createUser).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when trying to register with non-STUDENT role', async () => {
      // Arrange
      const registerDto = {
        email: 'new@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.ADMIN,
      };

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: Role.STUDENT,
      };
      usersService.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      // Arrange
      const refreshToken = 'validRefreshToken';
      const payload = { sub: '1', email: 'test@example.com' };
      tokensService.verifyRefreshToken.mockResolvedValue(payload);
      usersService.findUserById.mockResolvedValue(mockUser);
      tokensService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      const result = await service.refreshTokens(refreshToken);

      // Assert
      expect(result).toEqual(mockTokens);
      expect(tokensService.verifyRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(usersService.findUserById).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      // Arrange
      const refreshToken = 'invalidRefreshToken';
      tokensService.verifyRefreshToken.mockRejectedValue(new Error());

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
