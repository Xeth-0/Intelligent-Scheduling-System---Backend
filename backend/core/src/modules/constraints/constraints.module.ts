import { Module } from '@nestjs/common';
import { ConstraintService } from './constraints.service';
import { ConstraintController } from './constraints.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard, RolesGuard } from '../../common/guards';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../auth/tokens.service';

@Module({
  providers: [
    ConstraintService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    TokensService,
  ],
  controllers: [ConstraintController],
  imports: [PrismaModule],
  exports: [ConstraintService],
})
export class ConstraintsModule {}
