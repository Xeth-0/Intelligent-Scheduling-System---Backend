/*
  Warnings:

  - You are about to drop the column `userId` on the `Preference` table. All the data in the column will be lost.
  - You are about to drop the column `classGroupId` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `subjectId` on the `Schedule` table. All the data in the column will be lost.
  - You are about to drop the column `classGroupId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `departmentId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ClassGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subject` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `YearGroup` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_UserSubjects` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `teacherId` to the `Preference` table without a default value. This is not possible if the table is not empty.
  - Added the required column `courseId` to the `Schedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ClassGroup" DROP CONSTRAINT "ClassGroup_yearGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Preference" DROP CONSTRAINT "Preference_userId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_classGroupId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "Schedule" DROP CONSTRAINT "Schedule_teacherId_fkey";

-- DropForeignKey
ALTER TABLE "Subject" DROP CONSTRAINT "Subject_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_classGroupId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "YearGroup" DROP CONSTRAINT "YearGroup_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "_UserSubjects" DROP CONSTRAINT "_UserSubjects_A_fkey";

-- DropForeignKey
ALTER TABLE "_UserSubjects" DROP CONSTRAINT "_UserSubjects_B_fkey";

-- AlterTable
ALTER TABLE "Classroom" ADD COLUMN     "buildingId" TEXT,
ADD COLUMN     "isWheelchairAccessible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Preference" DROP COLUMN "userId",
ADD COLUMN     "teacherId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Schedule" DROP COLUMN "classGroupId",
DROP COLUMN "subjectId",
ADD COLUMN     "courseId" TEXT NOT NULL,
ADD COLUMN     "sessionType" TEXT,
ADD COLUMN     "studentGroupId" TEXT,
ADD COLUMN     "timeSlot" INTEGER;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "classGroupId",
DROP COLUMN "departmentId",
ADD COLUMN     "needWheelchairAccessibleRoom" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "ClassGroup";

-- DropTable
DROP TABLE "Subject";

-- DropTable
DROP TABLE "YearGroup";

-- DropTable
DROP TABLE "_UserSubjects";

-- CreateTable
CREATE TABLE "Building" (
    "buildingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,

    CONSTRAINT "Building_pkey" PRIMARY KEY ("buildingId")
);

-- CreateTable
CREATE TABLE "Teacher" (
    "teacherId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("teacherId")
);

-- CreateTable
CREATE TABLE "Student" (
    "studentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentGroupId" TEXT,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "Admin" (
    "adminId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("adminId")
);

-- CreateTable
CREATE TABLE "Course" (
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "departmentId" TEXT,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("courseId")
);

-- CreateTable
CREATE TABLE "StudentGroup" (
    "studentGroupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "accessibilityRequirement" BOOLEAN NOT NULL DEFAULT false,
    "departmentId" TEXT NOT NULL,

    CONSTRAINT "StudentGroup_pkey" PRIMARY KEY ("studentGroupId")
);

-- CreateTable
CREATE TABLE "_CourseTeachers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseTeachers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CourseToStudentGroup" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CourseToStudentGroup_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_userId_key" ON "Teacher"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_userId_key" ON "Student"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_userId_key" ON "Admin"("userId");

-- CreateIndex
CREATE INDEX "_CourseTeachers_B_index" ON "_CourseTeachers"("B");

-- CreateIndex
CREATE INDEX "_CourseToStudentGroup_B_index" ON "_CourseToStudentGroup"("B");

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("deptId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_studentGroupId_fkey" FOREIGN KEY ("studentGroupId") REFERENCES "StudentGroup"("studentGroupId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("deptId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroup" ADD CONSTRAINT "StudentGroup_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("deptId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classroom" ADD CONSTRAINT "Classroom_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building"("buildingId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("courseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("teacherId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_studentGroupId_fkey" FOREIGN KEY ("studentGroupId") REFERENCES "StudentGroup"("studentGroupId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preference" ADD CONSTRAINT "Preference_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("teacherId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseTeachers" ADD CONSTRAINT "_CourseTeachers_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("courseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseTeachers" ADD CONSTRAINT "_CourseTeachers_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("teacherId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToStudentGroup" ADD CONSTRAINT "_CourseToStudentGroup_A_fkey" FOREIGN KEY ("A") REFERENCES "Course"("courseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToStudentGroup" ADD CONSTRAINT "_CourseToStudentGroup_B_fkey" FOREIGN KEY ("B") REFERENCES "StudentGroup"("studentGroupId") ON DELETE CASCADE ON UPDATE CASCADE;
