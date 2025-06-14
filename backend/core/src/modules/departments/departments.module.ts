import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from 'src/common/guards';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../auth/tokens.service';
import { RolesGuard } from 'src/common/guards';
import { CampusValidationService } from '../../common/services/campus-validation.service';

@Module({
  providers: [
    DepartmentsService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    TokensService,
    CampusValidationService,
  ],
  controllers: [DepartmentsController],
  imports: [PrismaModule],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
