-- Make user relations nullable and set ON DELETE SET NULL
-- This preserves appointments, quotes, notes, and quote files when users are deleted

-- Drop existing foreign key constraints
DO $$ 
BEGIN
    -- Drop appointments_salesRepId_fkey
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'appointments_salesRepId_fkey'
    ) THEN
        ALTER TABLE "appointments" DROP CONSTRAINT "appointments_salesRepId_fkey";
    END IF;

    -- Drop quotes_salesRepId_fkey
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quotes_salesRepId_fkey'
    ) THEN
        ALTER TABLE "quotes" DROP CONSTRAINT "quotes_salesRepId_fkey";
    END IF;

    -- Drop quote_files_uploadedByUserId_fkey
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'quote_files_uploadedByUserId_fkey'
    ) THEN
        ALTER TABLE "quote_files" DROP CONSTRAINT "quote_files_uploadedByUserId_fkey";
    END IF;

    -- Drop lead_notes_createdBy_fkey
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_notes_createdBy_fkey'
    ) THEN
        ALTER TABLE "lead_notes" DROP CONSTRAINT "lead_notes_createdBy_fkey";
    END IF;
END $$;

-- Alter columns to be nullable
ALTER TABLE "appointments" ALTER COLUMN "salesRepId" DROP NOT NULL;
ALTER TABLE "quotes" ALTER COLUMN "salesRepId" DROP NOT NULL;
ALTER TABLE "quote_files" ALTER COLUMN "uploadedByUserId" DROP NOT NULL;
ALTER TABLE "lead_notes" ALTER COLUMN "createdBy" DROP NOT NULL;

-- Re-add foreign key constraints with ON DELETE SET NULL
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_salesRepId_fkey" 
    FOREIGN KEY ("salesRepId") REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_salesRepId_fkey" 
    FOREIGN KEY ("salesRepId") REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "quote_files" ADD CONSTRAINT "quote_files_uploadedByUserId_fkey" 
    FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "lead_notes" ADD CONSTRAINT "lead_notes_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
