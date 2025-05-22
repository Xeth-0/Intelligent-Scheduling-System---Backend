/*
  Warnings:

  - You are about to drop the column `classroomId` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `courseId` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `isFinalized` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `sessionType` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `startTime` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `studentGroupId` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `timeSlot` on the `Schedule` table. All the data in the column will be lost.
  - Made the column `departmentId` on table `Teacher` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_classroomId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_courseId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_studentGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_teacherId_fkey";

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "sessionType" SET DEFAULT 'LECTURE';

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "classroomId",
DROP COLUMN "courseId",
DROP COLUMN "endTime",
DROP COLUMN "isFinalized",
DROP COLUMN "sessionType",
DROP COLUMN "startTime",
DROP COLUMN "studentGroupId",
DROP COLUMN "teacherId",
DROP COLUMN "timeSlot";

-- AlterTable
ALTER TABLE "Teacher" ALTER COLUMN "departmentId" SET NOT NULL;

-- CreateTable
CREATE TABLE "ScheduleItem" (
    "scheduleItemId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "sessionType" "SessionType",
    "timeSlot" INTEGER,
    "day" "DayOfWeek" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "courseId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classroomId" TEXT,
    "studentGroupId" TEXT,
    "scheduleId" TEXT NOT NULL,

    CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("scheduleItemId")
);

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("courseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("teacherId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("classroomId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_studentGroupId_fkey" FOREIGN KEY ("studentGroupId") REFERENCES "StudentGroup"("studentGroupId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleItem" ADD CONSTRAINT "ScheduleItem_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "Schedule"("scheduleId") ON DELETE CASCADE ON UPDATE CASCADE;
