/*
  Warnings:

  - A unique constraint covering the columns `[scheduleId,timeslotId,startTime,endTime,day,classroomId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduleId,timeslotId,startTime,endTime,day,teacherId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduleId,timeslotId,startTime,endTime,day,studentGroupId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ScheduleItem_timeslotId_startTime_endTime_day_classroomId_key";

-- DropIndex
DROP INDEX "ScheduleItem_timeslotId_startTime_endTime_day_studentGroupI_key";

-- DropIndex
DROP INDEX "ScheduleItem_timeslotId_startTime_endTime_day_teacherId_key";

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_scheduleId_timeslotId_startTime_endTime_day_cl_key" ON "ScheduleItem"("scheduleId", "timeslotId", "startTime", "endTime", "day", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_scheduleId_timeslotId_startTime_endTime_day_te_key" ON "ScheduleItem"("scheduleId", "timeslotId", "startTime", "endTime", "day", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_scheduleId_timeslotId_startTime_endTime_day_st_key" ON "ScheduleItem"("scheduleId", "timeslotId", "startTime", "endTime", "day", "studentGroupId");
