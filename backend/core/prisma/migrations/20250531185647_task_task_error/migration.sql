-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('COMPLETED', 'QUEUED', 'FAILED');

-- CreateTable
CREATE TABLE "Task" (
    "taskId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "campusId" TEXT,
    "status" "TaskStatus" NOT NULL,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("taskId")
);

-- CreateTable
CREATE TABLE "TaskError" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskError_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("adminId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("campusId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskError" ADD CONSTRAINT "TaskError_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("taskId") ON DELETE CASCADE ON UPDATE CASCADE;
