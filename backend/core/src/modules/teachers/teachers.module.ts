import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from 'src/common/guards';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../auth/tokens.service';
import { RolesGuard } from 'src/common/guards';
import { CampusValidationService } from '../../common/services/campus-validation.service';

@Module({
  providers: [
    TeachersService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    TokensService,
    CampusValidationService,
  ],
  controllers: [TeachersController],
  imports: [PrismaModule],
  exports: [TeachersService],
})
export class TeachersModule {}
