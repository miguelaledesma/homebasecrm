-- Add creditScore column to leads table
-- This column stores credit score information collected from public landing page submissions
ALTER TABLE "leads" ADD COLUMN "creditScore" TEXT;
