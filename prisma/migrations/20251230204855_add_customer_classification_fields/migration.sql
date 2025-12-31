-- Add customer classification fields to leads table
-- These fields are safe to add: they have defaults and won't affect existing data

-- Add isMilitaryFirstResponder column (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'isMilitaryFirstResponder'
    ) THEN
        ALTER TABLE "leads" ADD COLUMN "isMilitaryFirstResponder" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add isContractor column (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'isContractor'
    ) THEN
        ALTER TABLE "leads" ADD COLUMN "isContractor" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Add contractorLicenseNumber column (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'contractorLicenseNumber'
    ) THEN
        ALTER TABLE "leads" ADD COLUMN "contractorLicenseNumber" TEXT;
    END IF;
END $$;
