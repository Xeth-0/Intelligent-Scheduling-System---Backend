/*
  Warnings:

  - Added the required column `taskName` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `column` to the `TaskError` table without a default value. This is not possible if the table is not empty.
  - Added the required column `row` to the `TaskError` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "description" TEXT,
ADD COLUMN     "taskName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TaskError" ADD COLUMN     "column" TEXT NOT NULL,
ADD COLUMN     "row" INTEGER NOT NULL;
