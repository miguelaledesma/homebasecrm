-- AlterTable
ALTER TABLE "leads" ADD COLUMN "customerNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "leads_customerNumber_key" ON "leads"("customerNumber");

-- CreateIndex
CREATE INDEX "leads_customerNumber_idx" ON "leads"("customerNumber");
