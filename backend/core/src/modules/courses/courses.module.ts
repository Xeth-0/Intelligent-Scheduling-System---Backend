import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from 'src/common/guards';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../auth/tokens.service';
import { RolesGuard } from 'src/common/guards';
import { CampusValidationService } from '../../common/services/campus-validation.service';

@Module({
  providers: [
    CoursesService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    TokensService,
    CampusValidationService,
  ],
  controllers: [CoursesController],
  imports: [PrismaModule],
  exports: [CoursesService],
})
export class CoursesModule {}
