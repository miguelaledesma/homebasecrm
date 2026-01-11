-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "jobStatus" "JobStatus";
