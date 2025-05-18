import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs<JwtConfig>('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET!,
  refreshSecret: process.env.JWT_REFRESH_SECRET!,
  accessToken: {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
  },
  refreshToken: {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  },
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
};
