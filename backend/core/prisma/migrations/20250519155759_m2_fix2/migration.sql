/*
  Warnings:

  - You are about to drop the column `campusCampusId` on the `Schedule` table. All the data in the column will be lost.
  - Added the required column `campusId` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_campusCampusId_fkey";

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "campusCampusId",
ADD COLUMN     "campusId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("campusId") ON DELETE RESTRICT ON UPDATE CASCADE;
