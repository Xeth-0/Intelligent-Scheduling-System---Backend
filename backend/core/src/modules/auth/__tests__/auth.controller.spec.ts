import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, TokensDto} from '../dtos';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { UsersService } from '../../users/users.service';
import { Request } from 'express';


describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let usersService: jest.Mocked<UsersService>;

  const mockTokens: TokensDto = {
    accessToken: 'mockAccess',
    refreshToken: 'mockRefresh'
  };

  const mockUsersService = {
    isFirstUser: jest.fn(),
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn(),
      register: jest.fn(),
      refreshTokens: jest.fn(),
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
    usersService = module.get(UsersService);
  });

  describe('login', () => {
    it('should call authService.login with correct parameters', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123'
      };
      authService.login.mockResolvedValue(mockTokens);

      const result = await controller.login(loginDto);

      expect(result.data).toEqual(mockTokens);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      const loginDto: LoginDto = {
        email: 'wrong@example.com',
        password: 'wrongpass'
      };
      authService.login.mockRejectedValue(new UnauthorizedException());

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should force STUDENT role and call authService.register', async () => {
      const registerDto: RegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'new@example.com',
        password: 'password123',
        role: Role.ADMIN // Should be overridden
      };
      authService.register.mockResolvedValue(mockTokens);

      const result = await controller.register(registerDto);

      expect(result.data).toEqual(mockTokens);
      expect(authService.register).toHaveBeenCalledWith({
        ...registerDto,
        role: Role.STUDENT
      });
    });

    it('should throw ConflictException when email exists', async () => {
      const registerDto: RegisterDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'exists@example.com',
        password: 'password123',
        role: Role.STUDENT
      };
      authService.register.mockRejectedValue(new ConflictException('Email exists'));

      await expect(controller.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with header token', async () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue('Bearer validRefreshToken')
      } as unknown as Request;
      
      authService.refreshTokens.mockResolvedValue(mockTokens);

      const result = await controller.refresh(mockRequest);
      const expectedToken = 'validRefreshToken';

      expect(result.data).toEqual(mockTokens);
      expect(authService.refreshTokens).toHaveBeenCalledWith(expectedToken);
    });

    it('should throw UnauthorizedException when no token provided', async () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue(undefined)
      } as unknown as Request;

      await expect(controller.refresh(mockRequest)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const mockRequest = {
        get: jest.fn().mockReturnValue('Bearer invalidToken')
      } as unknown as Request;
      
      authService.refreshTokens.mockRejectedValue(new UnauthorizedException());

      await expect(controller.refresh(mockRequest)).rejects.toThrow(UnauthorizedException);
    });
  });
});
