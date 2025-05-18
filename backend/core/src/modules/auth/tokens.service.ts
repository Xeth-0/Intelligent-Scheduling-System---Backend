import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TokensDto } from './dtos/tokens.dto';
import { ITokensService } from '../.interfaces/token.service.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUserPayload } from '@/common/request/express.request.d';

@Injectable()
export class TokensService implements ITokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  async generateTokens(
    userId: string,
    email: string,
    role: Role,
  ): Promise<TokensDto> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(userId, email, role),
      this.generateRefreshToken(userId),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async generateAccessToken(
    userId: string,
    email: string,
    role: Role,
  ): Promise<string> {
    const payload = {
      sub: userId,
      email,
      role,
      type: 'access',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const payload = {
      sub: userId,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });
  }

  // runs on login, verifies the access token
  async verifyAccessToken(token: string): Promise<AuthenticatedUserPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('jwt.access_secret'),
    });
  }

  // runs on refresh, verifies the refresh token
  async verifyRefreshToken(token: string): Promise<AuthenticatedUserPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('jwt.refresh_secret'),
    });
  }

  // runs on login, saves the refresh token for the user
  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    try {
      await this.prismaService.refreshToken.create({
        data: {
          userId,
          token: refreshTokenHash,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    } catch {
      throw new InternalServerErrorException(
        `Failed to save refresh token for user ${userId}`,
      );
    }
  }

  // runs on logout, deletes all refresh tokens for the user
  async deleteRefreshToken(userId: string): Promise<void> {
    await this.prismaService.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
