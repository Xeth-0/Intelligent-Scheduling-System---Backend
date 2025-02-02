import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TokensService } from './tokens.service';
import { UsersModule } from '../users/users.module';
import {
  JwtAuthGuard,
  RolesGuard,
  RefreshJwtAuthGuard,
} from '../../common/guards';
import { PrismaModule } from '../../prisma/prisma.module';
import { RefreshJwtStrategy } from './strategies/refresh.jwt.strategy';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
      global: true,
      signOptions: { expiresIn: '1h' },
    }),
    UsersModule,
    PrismaModule,
  ],
  providers: [
    AuthService,
    TokensService,
    JwtAuthGuard,
    RolesGuard,
    RefreshJwtAuthGuard,
    RefreshJwtStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService, TokensService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
