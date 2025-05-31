/*
  Warnings:

  - You are about to drop the `Preference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PreferenceType` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PreferenceValue` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ConstraintScope" AS ENUM ('TEACHER_PREFERENCE', 'CAMPUS', 'DEPARTMENT', 'COURSE');

-- CreateEnum
CREATE TYPE "ConstraintValueType" AS ENUM ('TIME_SLOT', 'DAY_OF_WEEK', 'ROOM', 'NUMERIC_SCALE', 'BOOLEAN', 'COURSE_CRITERIA');

-- DropForeignKey
ALTER TABLE "Preference" DROP CONSTRAINT "Preference_preferenceTypeId_fkey";

-- DropForeignKey
ALTER TABLE "Preference" DROP CONSTRAINT "Preference_preferenceValueId_fkey";

-- DropForeignKey
ALTER TABLE "Preference" DROP CONSTRAINT "Preference_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "PreferenceType" DROP CONSTRAINT "PreferenceType_campusId_fkey";

-- DropForeignKey
ALTER TABLE "PreferenceValue" DROP CONSTRAINT "PreferenceValue_preferenceTypeId_fkey";

-- DropTable
DROP TABLE "Preference";

-- DropTable
DROP TABLE "PreferenceType";

-- DropTable
DROP TABLE "PreferenceValue";

-- CreateTable
CREATE TABLE "ConstraintType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "ConstraintScope" NOT NULL,
    "valueType" "ConstraintValueType" NOT NULL,
    "jsonSchema" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConstraintType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Constraint" (
    "id" TEXT NOT NULL,
    "constraintTypeId" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teacherId" TEXT,
    "campusId" TEXT,

    CONSTRAINT "Constraint_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Constraint" ADD CONSTRAINT "Constraint_constraintTypeId_fkey" FOREIGN KEY ("constraintTypeId") REFERENCES "ConstraintType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constraint" ADD CONSTRAINT "Constraint_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("teacherId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Constraint" ADD CONSTRAINT "Constraint_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("campusId") ON DELETE SET NULL ON UPDATE CASCADE;
