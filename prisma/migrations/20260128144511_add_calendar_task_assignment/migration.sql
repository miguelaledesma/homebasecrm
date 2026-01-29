-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CALENDAR_TASK';

-- AlterTable
ALTER TABLE "calendar_reminders" ADD COLUMN "assignedUserId" TEXT;

-- CreateIndex
CREATE INDEX "calendar_reminders_assignedUserId_idx" ON "calendar_reminders"("assignedUserId");

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN "calendarReminderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "notifications_calendarReminderId_key" ON "notifications"("calendarReminderId");

-- AddForeignKey
ALTER TABLE "calendar_reminders" ADD CONSTRAINT "calendar_reminders_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_calendarReminderId_fkey" FOREIGN KEY ("calendarReminderId") REFERENCES "calendar_reminders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
