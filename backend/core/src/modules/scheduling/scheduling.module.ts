import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { ConstraintsModule } from '../constraints/constraints.module';
import { TimeslotModule } from '../timeslots/timeslots.module';

@Module({
  providers: [SchedulingService],
  controllers: [SchedulingController],
  imports: [ConstraintsModule, TimeslotModule],
  exports: [SchedulingService],
})
export class SchedulingModule {}
