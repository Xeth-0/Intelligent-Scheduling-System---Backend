import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LoginDto, TokensDto } from '../dtos';
import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockTokens: TokensDto = {
    accessToken: 'mockAccess',
    refreshToken: 'mockRefresh',
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      refreshTokens: jest.fn(),
      logout: jest.fn(),
    };

    const mockUsersService = {
      findAllUsers: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      authService.login.mockResolvedValue(mockTokens);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result.data).toEqual(mockTokens);
      expect(result.statusCode).toBe(200);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'wrong@example.com',
        password: 'wrongpass',
      };
      authService.login.mockRejectedValue(new UnauthorizedException());

      await expect(controller.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('should refresh tokens successfully', async () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue('Bearer validRefreshToken'),
      } as unknown as Request;

      authService.refreshTokens.mockResolvedValue(mockTokens);

      const result = await controller.refresh(mockRequest);

      expect(result.data).toEqual(mockTokens);
      expect(authService.refreshTokens).toHaveBeenCalledWith('validRefreshToken');
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as Request;

      await expect(controller.refresh(mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
