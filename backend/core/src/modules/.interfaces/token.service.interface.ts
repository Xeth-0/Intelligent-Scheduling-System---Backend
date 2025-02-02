import { TokensDto } from '../auth/dtos/tokens.dto';
import { Role } from '@prisma/client';

export interface ITokensService {
  generateTokens(userId: string, email: string, role: Role): Promise<TokensDto>;
  verifyAccessToken(token: string): Promise<boolean>;
  verifyRefreshToken(token: string): Promise<any>;
  saveRefreshToken(userId: string, refreshToken: string): Promise<void>;
  deleteRefreshToken(userId: string): Promise<void>;
}
