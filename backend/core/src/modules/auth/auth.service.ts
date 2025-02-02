import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TokensService } from './tokens.service';
import { LoginDto, RegisterDto, TokensDto } from './dtos';
import { IAuthService } from '../.interfaces/auth.service.interface';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService implements IAuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly tokensService: TokensService,
  ) {}

  async login(loginDto: LoginDto): Promise<TokensDto> {
    const user = await this.usersService.findByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.tokensService.generateTokens(
      user.userId,
      user.email,
      user.role,
    );
    
    await this.tokensService.saveRefreshToken(user.userId, tokens.refreshToken);
    
    return tokens;
  }

  async register(registerDto: RegisterDto): Promise<TokensDto> {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const isFirstUser = await this.usersService.isFirstUser();
    
    if (!isFirstUser && registerDto.role !== Role.STUDENT) {
      throw new ForbiddenException('Only student accounts can be created publicly');
    }

    const user = await this.usersService.createUser({
      ...registerDto,
      password: registerDto.password,
    });

    const tokens = await this.tokensService.generateTokens(
      user.userId,
      user.email,
      user.role,
    );
    
    await this.tokensService.saveRefreshToken(user.userId, tokens.refreshToken);
    
    return tokens;
  }

  async refreshTokens(refreshToken: string): Promise<TokensDto> {
    try {
      const payload = await this.tokensService.verifyRefreshToken(refreshToken);
      const user = await this.usersService.findUserById(payload.sub);

      return this.tokensService.generateTokens(
        user.userId,
        user.email,
        user.role,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    return isPasswordValid ? user : null;
  }

  async logout(userId: string): Promise<void> {
    await this.tokensService.deleteRefreshToken(userId);
  }
}
