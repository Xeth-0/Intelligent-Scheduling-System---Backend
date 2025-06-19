import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { TokensService } from '../tokens.service';
import { UnauthorizedException } from '@nestjs/common';
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
    phone: '1234567890',
    needWheelchairAccessibleRoom: false,
    role: Role.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUserResponse = {
    userId: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'test@example.com',
    role: Role.STUDENT,
    createdAt: new Date(),
    updatedAt: new Date(),
    needWheelchairAccessibleRoom: false,
    phoneNumber: '1234567890',
  };

  const mockTokens = {
    accessToken: 'mockAccessToken',
    refreshToken: 'mockRefreshToken',
  };

  beforeEach(async () => {
    const mockUsersService = {
      findByEmail: jest.fn(),
      findUserById: jest.fn(),
    };

    const mockTokensService = {
      generateTokens: jest.fn(),
      verifyRefreshToken: jest.fn(),
      saveRefreshToken: jest.fn(),
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
      const loginDto = { email: 'test@example.com', password: 'password123' };
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      tokensService.generateTokens.mockResolvedValue(mockTokens);

      const result = await service.login(loginDto);

      expect(result).toEqual(mockTokens);
      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.passwordHash,
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens with valid refresh token', async () => {
      const refreshToken = 'validRefreshToken';
      const payload = {
        sub: '1',
        email: 'test@example.com',
        role: Role.STUDENT,
      };
      tokensService.verifyRefreshToken.mockResolvedValue(payload);
      usersService.findUserById.mockResolvedValue(mockUserResponse);
      tokensService.generateTokens.mockResolvedValue(mockTokens);

      const result = await service.refreshTokens(refreshToken);

      expect(result).toEqual(mockTokens);
      expect(tokensService.verifyRefreshToken).toHaveBeenCalledWith(
        refreshToken,
      );
      expect(usersService.findUserById).toHaveBeenCalledWith(payload.sub);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      const refreshToken = 'invalidRefreshToken';
      tokensService.verifyRefreshToken.mockRejectedValue(new Error());

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
