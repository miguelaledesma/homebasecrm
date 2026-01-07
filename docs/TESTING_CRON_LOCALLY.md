# Testing the Cron Job Locally

This guide explains how to test the 48-hour inactivity check cron job on your local machine.

## Quick Test

Run the script directly:

```bash
npm run cron:check-inactivity
```

Or with tsx directly:

```bash
tsx scripts/check-inactivity.ts
```

## Testing Scenarios

### 1. Test with Existing Leads

If you have leads in your database, the script will check them. However, they might not be inactive for 48+ hours yet.

### 2. Manually Adjust Timestamps (Recommended)

To test without waiting 48 hours, you can manually adjust timestamps in your database:

#### Option A: Using Prisma Studio (Easiest)

```bash
npx prisma studio
```

1. Navigate to the `leads` table
2. Find a lead with an `assignedSalesRepId`
3. Click on the lead to edit
4. Find the `updatedAt` field
5. Change it to a date that's more than 48 hours ago (e.g., 3 days ago)
6. Save

Then run the cron script:

```bash
npm run cron:check-inactivity
```

#### Option B: Using SQL

Connect to your database and run:

```sql
-- Set a lead's updatedAt to 3 days ago
UPDATE leads
SET "updatedAt" = NOW() - INTERVAL '3 days'
WHERE id = 'your-lead-id-here';

-- Also set any related notes/appointments/quotes to be old
UPDATE lead_notes
SET "createdAt" = NOW() - INTERVAL '3 days'
WHERE "leadId" = 'your-lead-id-here';

UPDATE appointments
SET "createdAt" = NOW() - INTERVAL '3 days'
WHERE "leadId" = 'your-lead-id-here';

UPDATE quotes
SET "createdAt" = NOW() - INTERVAL '3 days'
WHERE "leadId" = 'your-lead-id-here';
```

### 3. Create a Test Lead with Old Timestamp

You can create a test lead directly with an old timestamp:

```sql
-- First, get a sales rep ID
SELECT id FROM users WHERE role = 'SALES_REP' LIMIT 1;

-- Create a test lead with old timestamp
INSERT INTO leads (
  id,
  "customerId",
  "leadTypes",
  status,
  "assignedSalesRepId",
  "createdAt",
  "updatedAt"
) VALUES (
  'test-lead-' || gen_random_uuid()::text,
  (SELECT id FROM customers LIMIT 1),
  ARRAY['OTHER']::"LeadType"[],
  'ASSIGNED',
  (SELECT id FROM users WHERE role = 'SALES_REP' LIMIT 1),
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);
```

## Expected Output

When the script runs successfully, you should see:

```
Starting inactivity check...
Found X leads to check
Processed X leads
Created Y notifications
Created Y tasks
Inactivity check completed successfully
```

## Verifying Results

After running the script, check:

1. **Notifications were created:**

   ```sql
   SELECT * FROM notifications
   WHERE type = 'LEAD_INACTIVITY'
   ORDER BY "createdAt" DESC
   LIMIT 5;
   ```

2. **Tasks were created:**

   ```sql
   SELECT * FROM tasks
   WHERE type = 'LEAD_INACTIVITY'
   ORDER BY "createdAt" DESC
   LIMIT 5;
   ```

3. **Check in the UI:**
   - Open the app and check the notification bell icon
   - Go to the Tasks page
   - You should see the inactive lead task

## Testing Duplicate Prevention

To test that duplicates aren't created:

1. Run the script once
2. Run it again immediately
3. Check that no duplicate notifications/tasks were created:
   ```sql
   SELECT "leadId", COUNT(*)
   FROM notifications
   WHERE type = 'LEAD_INACTIVITY'
   GROUP BY "leadId"
   HAVING COUNT(*) > 1;
   ```

## Testing Edge Cases

### Test with leads that have recent activity

1. Create a lead with old `updatedAt`
2. But add a recent note/appointment/quote
3. Run the script
4. Verify it doesn't create a notification (because recent activity exists)

### Test with WON/LOST leads

1. Set a lead status to WON or LOST
2. Set updatedAt to old date
3. Run the script
4. Verify it doesn't create a notification (WON/LOST leads are excluded)

### Test with unassigned leads

1. Set a lead's `assignedSalesRepId` to NULL
2. Set updatedAt to old date
3. Run the script
4. Verify it doesn't create a notification (unassigned leads are excluded)

## Debugging

If the script isn't working as expected:

1. **Check database connection:**

   - Verify `DATABASE_URL` is set in your `.env` file
   - Test connection: `npx prisma db pull`

2. **Check logs:**

   - The script logs all errors
   - Look for specific lead IDs that failed

3. **Verify lead activity calculation:**

   - Check what `getLastActivityTimestamp` returns for a specific lead
   - You can add temporary console.log statements in the script

4. **Check Prisma client:**
   - Make sure Prisma client is generated: `npx prisma generate`

## Quick Test Script

You can also create a quick test script to verify a specific lead:

```typescript
// test-single-lead.ts
import { prisma } from "./lib/prisma";
import { getLastActivityTimestamp, isLeadInactive } from "./lib/lead-activity";

async function testLead(leadId: string) {
  const lastActivity = await getLastActivityTimestamp(leadId);
  const inactive = await isLeadInactive(leadId, 48);

  console.log(`Lead: ${leadId}`);
  console.log(`Last Activity: ${lastActivity}`);
  console.log(`Is Inactive (>48hrs): ${inactive}`);

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      notes: { orderBy: { createdAt: "desc" }, take: 1 },
      appointments: { orderBy: { createdAt: "desc" }, take: 1 },
      quotes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  console.log(`Lead updatedAt: ${lead?.updatedAt}`);
  console.log(`Latest note: ${lead?.notes[0]?.createdAt}`);
  console.log(`Latest appointment: ${lead?.appointments[0]?.createdAt}`);
  console.log(`Latest quote: ${lead?.quotes[0]?.createdAt}`);

  await prisma.$disconnect();
}

testLead(process.argv[2]);
```

Run with:

```bash
tsx test-single-lead.ts your-lead-id-here
```
