import { Module } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';
import { ConstraintsModule } from '../constraints/constraints.module';
import { TimeslotModule } from '../timeslots/timeslots.module';
import { CampusValidationService } from '../../common/services/campus-validation.service';

@Module({
  providers: [SchedulingService, MetricsService, CampusValidationService],
  controllers: [SchedulingController, MetricsController],
  imports: [ConstraintsModule, TimeslotModule],
  exports: [SchedulingService, MetricsService],
})
export class SchedulingModule {}
