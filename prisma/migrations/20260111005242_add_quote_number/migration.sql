-- AlterTable
ALTER TABLE "quotes" ADD COLUMN "quoteNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "quotes_quoteNumber_key" ON "quotes"("quoteNumber");

-- CreateIndex
CREATE INDEX "quotes_quoteNumber_idx" ON "quotes"("quoteNumber");

-- Make it NOT NULL after ensuring all existing quotes have values
-- Note: If you have existing quotes, you'll need to update them before making this NOT NULL
-- For now, we'll keep it nullable in the database but make it required in the application
