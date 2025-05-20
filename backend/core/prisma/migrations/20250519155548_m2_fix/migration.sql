/*
  Warnings:

  - The primary key for the `ScheduleItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `scheduleItemId` on the `ScheduleItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[departmentId,name]` on the table `StudentGroup` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `campusId` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `floor` to the `Classroom` table without a default value. This is not possible if the table is not empty.
  - Added the required column `campusCampusId` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `generatedByAdminId` to the `Schedule` table without a default value. This is not possible if the table is not empty.
  - The required column `scheduledSessionId` was added to the `ScheduleItem` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "campusId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "floor" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "campusCampusId" TEXT NOT NULL,
ADD COLUMN     "fitnessScore" DOUBLE PRECISION,
ADD COLUMN     "generatedByAdminId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ScheduleItem" DROP CONSTRAINT "ScheduleItem_pkey",
DROP COLUMN "scheduleItemId",
ADD COLUMN     "scheduledSessionId" TEXT NOT NULL,
ADD CONSTRAINT "ScheduleItem_pkey" PRIMARY KEY ("scheduledSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentGroup_departmentId_name_key" ON "StudentGroup"("departmentId", "name");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("campusId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_campusCampusId_fkey" FOREIGN KEY ("campusCampusId") REFERENCES "Campus"("campusId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_generatedByAdminId_fkey" FOREIGN KEY ("generatedByAdminId") REFERENCES "Admin"("adminId") ON DELETE RESTRICT ON UPDATE CASCADE;
