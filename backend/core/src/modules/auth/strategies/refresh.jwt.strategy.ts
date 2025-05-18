import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import * as bcrypt from 'bcrypt';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh_strategy',
) {
  constructor(
    private config: ConfigService,
    private prismaService: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('jwt.refreshSecret'),
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: { sub: string }) {
    const refreshToken = req
      .get('authorization')
      ?.replace('Bearer ', '')
      .trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    // Get all stored refresh tokens for the user
    const storedTokens = await this.prismaService.refreshToken.findMany({
      where: {
        userId: payload.sub,
      },
    });

    // Compare incoming token with all stored hashes
    const validToken = await Promise.all(
      storedTokens.map(async (storedToken) => {
        return bcrypt.compare(refreshToken, storedToken.token);
      }),
    ).then((results) => storedTokens[results.findIndex((result) => result)]);

    if (!validToken || new Date(validToken.expiresAt) < new Date()) {
      throw new UnauthorizedException(
        'Refresh token is invalid or expired. Please login again.',
      );
    }

    // Delete the used refresh token
    await this.prismaService.refreshToken.delete({
      where: { refreshTokenId: validToken.refreshTokenId },
    });

    return payload;
  }
}
