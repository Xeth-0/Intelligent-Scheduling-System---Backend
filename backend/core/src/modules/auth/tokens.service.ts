import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TokensDto } from './dtos/tokens.dto';
import { ITokensService } from '../__interfaces__/token.service.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUserPayload } from '@/common/request/express.request.d';

@Injectable()
export class TokensService implements ITokensService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  private readonly JWT_EXPIRATION = this.configService.get<string>(
    'jwt.accessToken.expiresIn',
  );
  private readonly JWT_REFRESH_EXPIRATION = this.configService.get<string>(
    'jwt.refreshToken.expiresIn',
  );
  private readonly JWT_IGNORE_EXPIRATION = this.configService.get<boolean>(
    'jwt.ignoreExpiration',
  );
  private readonly JWT_ACCESS_SECRET =
    this.configService.get<string>('jwt.accessSecret');
  private readonly JWT_REFRESH_SECRET =
    this.configService.get<string>('jwt.refreshSecret');

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
      secret: this.JWT_ACCESS_SECRET,
      expiresIn: this.JWT_EXPIRATION,
    });
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const payload = {
      sub: userId,
      type: 'refresh',
    };

    return this.jwtService.signAsync(payload, {
      secret: this.JWT_REFRESH_SECRET,
      expiresIn: this.JWT_REFRESH_EXPIRATION,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUserPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.JWT_ACCESS_SECRET,
      ignoreExpiration: this.JWT_IGNORE_EXPIRATION,
    });
  }

  async verifyRefreshToken(token: string): Promise<AuthenticatedUserPayload> {
    return this.jwtService.verifyAsync(token, {
      secret: this.JWT_REFRESH_SECRET,
      ignoreExpiration: this.JWT_IGNORE_EXPIRATION,
    });
  }

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

  async deleteRefreshToken(userId: string): Promise<void> {
    await this.prismaService.refreshToken.deleteMany({
      where: { userId },
    });
  }
}
