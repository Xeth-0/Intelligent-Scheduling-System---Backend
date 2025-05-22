/*
  Warnings:

  - Added the required column `sessionType` to the `Course` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionsPerWeek` to the `Course` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('LECTURE', 'LAB', 'SEMINAR');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "description" TEXT,
ADD COLUMN     "sessionType" "SessionType" NOT NULL,
ADD COLUMN     "sessionsPerWeek" INTEGER NOT NULL;
