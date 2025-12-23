-- Add referral tracking fields to leads table
ALTER TABLE "leads" ADD COLUMN "referrerFirstName" TEXT;
ALTER TABLE "leads" ADD COLUMN "referrerLastName" TEXT;
ALTER TABLE "leads" ADD COLUMN "referrerPhone" TEXT;
ALTER TABLE "leads" ADD COLUMN "referrerEmail" TEXT;
ALTER TABLE "leads" ADD COLUMN "referrerCustomerId" TEXT;
ALTER TABLE "leads" ADD COLUMN "referrerIsCustomer" BOOLEAN NOT NULL DEFAULT false;

-- Add foreign key constraint for referrerCustomerId
ALTER TABLE "leads" ADD CONSTRAINT "leads_referrerCustomerId_fkey" FOREIGN KEY ("referrerCustomerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

