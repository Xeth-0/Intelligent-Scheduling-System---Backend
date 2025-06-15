/*
  Warnings:

  - You are about to drop the column `taskName` on the `Task` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `severity` to the `TaskError` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskSeverity" AS ENUM ('WARNING', 'ERROR');

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "taskName",
ADD COLUMN     "fileName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TaskError" ADD COLUMN     "severity" "TaskSeverity" NOT NULL;
