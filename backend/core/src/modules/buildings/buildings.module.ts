import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from 'src/common/guards';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../auth/tokens.service';
import { RolesGuard } from 'src/common/guards';

@Module({
  providers: [
    BuildingsService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    TokensService,
  ],
  controllers: [BuildingsController],
  imports: [PrismaModule],
  exports: [BuildingsService],
})
export class BuildingsModule {}
