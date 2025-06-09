/*
  Warnings:

  - The values [CAMPUS,DEPARTMENT,COURSE] on the enum `ConstraintScope` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `weight` on the `Constraint` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ConstraintScope_new" AS ENUM ('CAMPUS_PREFERENCE', 'TEACHER_PREFERENCE', 'STUDENT_GROUP_PREFERENCE');
ALTER TABLE "ConstraintType" ALTER COLUMN "category" TYPE "ConstraintScope_new" USING ("category"::text::"ConstraintScope_new");
ALTER TYPE "ConstraintScope" RENAME TO "ConstraintScope_old";
ALTER TYPE "ConstraintScope_new" RENAME TO "ConstraintScope";
DROP TYPE "ConstraintScope_old";
COMMIT;

-- AlterEnum
ALTER TYPE "ConstraintValueType" ADD VALUE 'SCHEDULE_STRUCTURE';

-- AlterTable
ALTER TABLE "Constraint" DROP COLUMN "weight",
ADD COLUMN     "priority" DOUBLE PRECISION NOT NULL DEFAULT 5.0;
