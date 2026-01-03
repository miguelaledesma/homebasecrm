-- CreateEnum
CREATE TYPE "HearAboutUs" AS ENUM ('YELP', 'FACEBOOK', 'DRIVING_BY', 'OTHER');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN "hearAboutUs" "HearAboutUs";
ALTER TABLE "leads" ADD COLUMN "hearAboutUsOther" TEXT;
