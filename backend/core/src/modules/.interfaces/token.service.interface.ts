import { Role } from '@prisma/client';
import { AuthenticatedUserPayload } from '@/common/request/express.request.d';
import { TokensDto } from '../auth/dtos/tokens.dto';

export interface ITokensService {
  generateTokens(userId: string, email: string, role: Role): Promise<TokensDto>;
  verifyAccessToken(token: string): Promise<AuthenticatedUserPayload>;
  verifyRefreshToken(token: string): Promise<AuthenticatedUserPayload>;
  saveRefreshToken(userId: string, refreshToken: string): Promise<void>;
  deleteRefreshToken(userId: string): Promise<void>;
}
