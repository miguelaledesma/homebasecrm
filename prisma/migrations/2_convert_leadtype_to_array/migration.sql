-- Convert leadType (single) to leadTypes (array)
-- Step 1: Add new array column
ALTER TABLE "leads" ADD COLUMN "leadTypes" "LeadType"[];

-- Step 2: Migrate existing data (convert single value to array)
UPDATE "leads" SET "leadTypes" = ARRAY["leadType"] WHERE "leadType" IS NOT NULL;

-- Step 3: Make leadTypes NOT NULL (after data migration)
ALTER TABLE "leads" ALTER COLUMN "leadTypes" SET NOT NULL;

-- Step 4: Drop old column
ALTER TABLE "leads" DROP COLUMN "leadType";

