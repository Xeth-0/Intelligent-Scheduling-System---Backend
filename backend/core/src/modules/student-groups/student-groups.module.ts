import { Module } from '@nestjs/common';
import { StudentGroupsService } from './student-groups.service';
import { StudentGroupsController } from './student-groups.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtAuthGuard } from 'src/common/guards';
import { JwtService } from '@nestjs/jwt';
import { TokensService } from '../auth/tokens.service';
import { RolesGuard } from 'src/common/guards';
import { CampusValidationService } from '../../common/services/campus-validation.service';

@Module({
  providers: [
    StudentGroupsService,
    PrismaService,
    JwtAuthGuard,
    RolesGuard,
    JwtService,
    TokensService,
    CampusValidationService,
  ],
  controllers: [StudentGroupsController],
  imports: [PrismaModule],
  exports: [StudentGroupsService],
})
export class StudentGroupsModule {}
