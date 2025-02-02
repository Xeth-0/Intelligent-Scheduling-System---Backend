import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_ACCESS_SECRET!,
  accessToken: {
    expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION!,
  },
  refreshToken: {
    expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION!,
  },
}));

export type JwtConfig = {
  secret: string;
  accessToken: {
    expiresIn: string;
  };
  refreshToken: {
    expiresIn: string; 
  };
};
