-- Add performance indexes for better query performance

-- Leads table indexes
CREATE INDEX IF NOT EXISTS "leads_status_idx" ON "leads"("status");
CREATE INDEX IF NOT EXISTS "leads_assignedSalesRepId_idx" ON "leads"("assignedSalesRepId");
CREATE INDEX IF NOT EXISTS "leads_createdAt_idx" ON "leads"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "leads_customerId_idx" ON "leads"("customerId");

-- Composite index for common query pattern: status + assignedSalesRepId
CREATE INDEX IF NOT EXISTS "leads_status_assignedSalesRepId_idx" ON "leads"("status", "assignedSalesRepId");

-- Appointments table indexes
CREATE INDEX IF NOT EXISTS "appointments_salesRepId_idx" ON "appointments"("salesRepId");
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments"("status");
CREATE INDEX IF NOT EXISTS "appointments_scheduledFor_idx" ON "appointments"("scheduledFor");
CREATE INDEX IF NOT EXISTS "appointments_leadId_idx" ON "appointments"("leadId");

-- Composite index for common query: salesRepId + status + scheduledFor
CREATE INDEX IF NOT EXISTS "appointments_salesRep_status_scheduled_idx" ON "appointments"("salesRepId", "status", "scheduledFor");

-- Customers table indexes (for lookups)
CREATE INDEX IF NOT EXISTS "customers_phone_idx" ON "customers"("phone") WHERE "phone" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "customers_email_idx" ON "customers"("email") WHERE "email" IS NOT NULL;

-- Quotes table indexes
CREATE INDEX IF NOT EXISTS "quotes_salesRepId_idx" ON "quotes"("salesRepId");
CREATE INDEX IF NOT EXISTS "quotes_status_idx" ON "quotes"("status");
CREATE INDEX IF NOT EXISTS "quotes_leadId_idx" ON "quotes"("leadId");

-- User invitations index (for token lookups)
CREATE INDEX IF NOT EXISTS "user_invitations_token_idx" ON "user_invitations"("token");
CREATE INDEX IF NOT EXISTS "user_invitations_email_idx" ON "user_invitations"("email");

