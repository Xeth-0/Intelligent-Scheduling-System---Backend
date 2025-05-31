/*
  Warnings:

  - A unique constraint covering the columns `[timeslotId,startTime,endTime,day,classroomId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[timeslotId,startTime,endTime,day,teacherId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[timeslotId,startTime,endTime,day,studentGroupId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ScheduleItem_timeslotId_startTime_endTime_key";

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_timeslotId_startTime_endTime_day_classroomId_key" ON "ScheduleItem"("timeslotId", "startTime", "endTime", "day", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_timeslotId_startTime_endTime_day_teacherId_key" ON "ScheduleItem"("timeslotId", "startTime", "endTime", "day", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_timeslotId_startTime_endTime_day_studentGroupI_key" ON "ScheduleItem"("timeslotId", "startTime", "endTime", "day", "studentGroupId");
