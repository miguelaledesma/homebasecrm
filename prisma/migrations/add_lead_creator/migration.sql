-- AlterTable: Add createdBy column (nullable, safe for existing data)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'createdBy'
    ) THEN
        ALTER TABLE "leads" ADD COLUMN "createdBy" TEXT;
    END IF;
END $$;

-- CreateIndex: Only if column exists and index doesn't exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'createdBy'
    ) AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'leads' AND indexname = 'leads_createdBy_idx'
    ) THEN
        CREATE INDEX "leads_createdBy_idx" ON "leads"("createdBy");
    END IF;
END $$;

-- AddForeignKey: Only if column exists and constraint doesn't exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'createdBy'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'leads_createdBy_fkey'
    ) THEN
        ALTER TABLE "leads" ADD CONSTRAINT "leads_createdBy_fkey" 
        FOREIGN KEY ("createdBy") REFERENCES "users"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

