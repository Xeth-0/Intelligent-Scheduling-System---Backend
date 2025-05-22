-- AlterTable
ALTER TABLE "Schedule" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Schedule_campusId_active_idx" ON "Schedule"("campusId", "active");
