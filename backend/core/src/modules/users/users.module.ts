import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from 'src/common/guards';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../auth/tokens.service';
import { RolesGuard } from 'src/common/guards';

@Module({
  providers: [
    UsersService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    TokensService,
  ],
  controllers: [UsersController],
  imports: [PrismaModule],
  exports: [UsersService],
})
export class UsersModule {}
