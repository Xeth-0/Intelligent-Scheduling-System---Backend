import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from 'src/common/guards';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../auth/tokens.service';
import { RolesGuard } from 'src/common/guards';
import { CampusValidationService } from '../../common/services/campus-validation.service';

@Module({
  providers: [
    ClassroomsService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    TokensService,
    CampusValidationService,
  ],
  controllers: [ClassroomsController],
  imports: [PrismaModule],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
