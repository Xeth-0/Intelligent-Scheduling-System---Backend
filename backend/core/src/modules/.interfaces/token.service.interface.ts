import { type Role } from '@prisma/client';
import { type AuthenticatedUserPayload } from '@/common/request/express.request.d';
import { type TokensDto } from '../auth/dtos/tokens.dto';

export interface ITokensService {
  generateTokens(userId: string, email: string, role: Role): Promise<TokensDto>;
  verifyAccessToken(token: string): Promise<AuthenticatedUserPayload>;
  verifyRefreshToken(token: string): Promise<AuthenticatedUserPayload>;
  saveRefreshToken(userId: string, refreshToken: string): Promise<void>;
  deleteRefreshToken(userId: string): Promise<void>;
}
