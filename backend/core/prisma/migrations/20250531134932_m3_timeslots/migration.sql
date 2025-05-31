/*
  Warnings:

  - You are about to drop the column `timeSlot` on the `ScheduleItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[timeslotId,startTime,endTime]` on the table `ScheduleItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `timeslotId` to the `ScheduleItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ScheduleItem" DROP COLUMN "timeSlot",
ADD COLUMN     "timeslotId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "_CourseTeachers" ADD CONSTRAINT "_CourseTeachers_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CourseTeachers_AB_unique";

-- AlterTable
ALTER TABLE "_CourseToStudentGroup" ADD CONSTRAINT "_CourseToStudentGroup_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_CourseToStudentGroup_AB_unique";

-- CreateTable
CREATE TABLE "Timeslot" (
    "timeslotId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "Timeslot_pkey" PRIMARY KEY ("timeslotId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Timeslot_code_key" ON "Timeslot"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Timeslot_label_key" ON "Timeslot"("label");

-- CreateIndex
CREATE UNIQUE INDEX "Timeslot_startTime_key" ON "Timeslot"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Timeslot_endTime_key" ON "Timeslot"("endTime");

-- CreateIndex
CREATE UNIQUE INDEX "Timeslot_order_key" ON "Timeslot"("order");

-- CreateIndex
CREATE UNIQUE INDEX "Timeslot_timeslotId_startTime_endTime_key" ON "Timeslot"("timeslotId", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleItem_timeslotId_startTime_endTime_key" ON "ScheduleItem"("timeslotId", "startTime", "endTime");

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_timeslotId_startTime_endTime_fkey" FOREIGN KEY ("timeslotId", "startTime", "endTime") REFERENCES "Timeslot"("timeslotId", "startTime", "endTime") ON DELETE RESTRICT ON UPDATE CASCADE;
