/*
  Warnings:

  - You are about to drop the column `endTime` on the `ScheduleItem` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `ScheduleItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[scheduleId,timeslotId,day,classroomId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduleId,timeslotId,day,teacherId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[scheduleId,timeslotId,day,studentGroupId]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "ScheduleItem" DROP CONSTRAINT "ScheduleItem_timeslotId_startTime_endTime_fkey";

-- DropIndex
DROP INDEX "ScheduleItem_scheduleId_timeslotId_startTime_endTime_day_cl_key";

-- DropIndex
DROP INDEX "ScheduleItem_scheduleId_timeslotId_startTime_endTime_day_st_key";

-- DropIndex
DROP INDEX "ScheduleItem_scheduleId_timeslotId_startTime_endTime_day_te_key";

-- DropIndex
DROP INDEX "Timeslot_endTime_key";

-- DropIndex
DROP INDEX "Timeslot_label_key";

-- DropIndex
DROP INDEX "Timeslot_startTime_key";

-- DropIndex
DROP INDEX "Timeslot_timeslotId_startTime_endTime_key";

-- AlterTable
ALTER TABLE "ScheduleItem" DROP COLUMN "endTime",
DROP COLUMN "startTime";

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_scheduleId_timeslotId_day_classroomId_key" ON "ScheduleItem"("scheduleId", "timeslotId", "day", "classroomId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_scheduleId_timeslotId_day_teacherId_key" ON "ScheduleItem"("scheduleId", "timeslotId", "day", "teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_scheduleId_timeslotId_day_studentGroupId_key" ON "ScheduleItem"("scheduleId", "timeslotId", "day", "studentGroupId");

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_timeslotId_fkey" FOREIGN KEY ("timeslotId") REFERENCES "Timeslot"("timeslotId") ON DELETE RESTRICT ON UPDATE CASCADE;
