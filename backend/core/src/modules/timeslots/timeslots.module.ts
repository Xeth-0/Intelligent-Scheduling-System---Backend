import { Module } from '@nestjs/common';
import { TimeslotService } from './timeslots.service';
import { TimeslotController } from './timeslots.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  providers: [TimeslotService],
  controllers: [TimeslotController],
  imports: [PrismaModule],
  exports: [TimeslotService],
})
export class TimeslotModule {}
