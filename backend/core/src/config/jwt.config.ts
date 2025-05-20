import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs<JwtConfig>('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  accessToken: {
    expiresIn: process.env.JWT_ACCESS_EXPIRATION ?? '15m',
  },
  refreshToken: {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION ?? '7d',
  },
  ignoreExpiration: process.env.JWT_IGNORE_EXPIRATION
    ? process.env.JWT_IGNORE_EXPIRATION === 'true'
    : false,
}));

export type JwtConfig = {
  accessSecret: string;
  refreshSecret: string;
  accessToken: {
    expiresIn: string;
  };
  refreshToken: {
    expiresIn: string;
  };
  ignoreExpiration: boolean;
};
