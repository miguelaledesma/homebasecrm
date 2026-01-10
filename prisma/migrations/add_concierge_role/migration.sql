-- AlterEnum
-- Add CONCIERGE to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CONCIERGE';

-- AlterEnum
-- Add CONCIERGE_LEAD to NotificationType enum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CONCIERGE_LEAD';

