import { type GeneralScheduleResponse } from '../scheduling/dtos/schedule.dto';
import { type SearchSessionsBody } from '../scheduling/dtos/scheduleSearch.dto';

export interface ISchedulingService {
  generateSchedule(
    userId: string,
    scheduleName: string,
  ): Promise<GeneralScheduleResponse>;
  getAllSchedules(userId: string): Promise<GeneralScheduleResponse[]>;
  activateSchedule(
    userId: string,
    scheduleId: string,
  ): Promise<GeneralScheduleResponse>;
  getScheduleById(
    userId: string,
    scheduleId: string,
  ): Promise<GeneralScheduleResponse>;
  searchSessions(
    userId: string,
    body: SearchSessionsBody,
  ): Promise<GeneralScheduleResponse>;
}
