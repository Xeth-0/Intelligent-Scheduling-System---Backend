import { Injectable, NotImplementedException } from '@nestjs/common';
import {
  generalMockSchedule,
  GeneralSchedule,
  GeneralScheduleWrapperDto,
} from './dtos/generalSchedule.dto';
import {
  teacherMockSchedule,
  TeacherScheduleWrapperDto,
} from './dtos/teacherSchedule.dto';

@Injectable()
export class SchedulingService {
  constructor() {}
  async getGeneralSchedule(
    classGroupId?: string,
  ): Promise<GeneralScheduleWrapperDto> {
    // throw NotImplementedException;
    const filtered = classGroupId
      ? { [classGroupId]: generalMockSchedule.schedule[classGroupId] || {} }
      : generalMockSchedule;
    return { schedule: filtered };
  }

  async getTeacherSchedule(
    teacherId?: string,
  ): Promise<TeacherScheduleWrapperDto> {
    const filtered = teacherId
      ? { [teacherId]: teacherMockSchedule.schedule[teacherId] || {} }
      : teacherMockSchedule;
    return { schedule: filtered };
  }
}
