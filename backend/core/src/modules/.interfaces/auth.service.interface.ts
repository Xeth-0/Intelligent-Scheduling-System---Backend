import { type AuthenticatedUserPayload } from '@/common/request/express.request';
import { type LoginDto } from '../auth/dtos/login.dto';
import { type TokensDto } from '../auth/dtos/tokens.dto';

export abstract class IAuthService {
  // service interface methods
  abstract login(loginDto: LoginDto): Promise<TokensDto>;
  abstract refreshTokens(refreshToken: string): Promise<TokensDto>;
  abstract logout(userId: string): Promise<void>;
  abstract validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUserPayload>;
}
