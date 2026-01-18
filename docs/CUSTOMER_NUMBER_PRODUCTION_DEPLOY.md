# Customer Number Feature - Production Deployment Guide

## Overview
This guide covers deploying the customer number feature to production on Railway, including the database migration and backfilling existing leads.

## Deployment Strategy

### Phase 1: Deploy Code & Migration (Automatic)
The migration will run automatically when you deploy because your `build` script in `package.json` includes `prisma migrate deploy`.

### Phase 2: Backfill Existing Data (Manual)
After deployment, you'll need to manually run the backfill script to assign customer numbers to existing production leads.

---

## Step-by-Step Deployment

### Step 1: Commit and Push Changes

```bash
# Review your changes
git status

# Add all modified files
git add prisma/schema.prisma
git add prisma/migrations/20260118000000_add_customer_number/
git add app/api/leads/route.ts
git add app/(protected)/leads/page.tsx
git add app/(protected)/leads/[id]/page.tsx
git add scripts/backfill-customer-numbers.ts
git add docs/

# Commit with descriptive message
git commit -m "feat: Add customer numbers to leads (105-XXXXXX format)

- Add customerNumber field to Lead model
- Auto-generate sequential customer numbers for new leads
- Display customer numbers in leads list and detail pages
- Add backfill script for existing leads
- Indexed for fast searching"

# Push to your main branch (or create a PR)
git push origin main
```

### Step 2: Monitor Railway Deployment

1. Railway will automatically detect the push and start deploying
2. Watch the build logs in Railway dashboard
3. The build process will:
   - Install dependencies (`npm install`)
   - Generate Prisma client (`prisma generate`)
   - **Run the migration** (`prisma migrate deploy`) ✅
   - Build the Next.js app (`next build`)
   - Start the app (`npm start`)

4. Wait for deployment to complete (usually 2-5 minutes)

### Step 3: Verify Migration Success

Check that the migration ran successfully:

```bash
# Connect to Railway
railway login
railway link  # Select your project

# Check database schema
railway run npx prisma db pull --print

# You should see the customerNumber field in the Lead model
```

Or check directly in the database:

```bash
# Open PostgreSQL shell
railway run psql $DATABASE_URL

# Check if column exists
\d leads

# Should show: customerNumber | text | | |
# Should also show the unique constraint and indexes

# Exit
\q
```

### Step 4: Backfill Production Data

Now run the backfill script to assign customer numbers to all existing leads:

#### Option A: Using Railway CLI (Recommended)

```bash
# Make sure you're in the project directory
cd /Users/miguelledesma/landscaping-crm

# Run the backfill script in production
railway run npx tsx scripts/backfill-customer-numbers.ts
```

Expected output:
```
Starting customer number backfill...
Found X leads without customer numbers
Starting numbering from: 105-000001
Updated 10/X leads...
Updated 20/X leads...
✅ Successfully backfilled X customer numbers
```

#### Option B: Using Railway Dashboard (Alternative)

If Railway CLI isn't available:

1. Go to Railway dashboard
2. Select your project → Your app service
3. Go to the **"Deployments"** tab
4. Find the latest deployment
5. Click **"View Logs"**
6. In the deployment view, click **"Service Settings"** → **"One-off Commands"**
7. Run: `npx tsx scripts/backfill-customer-numbers.ts`

#### Option C: Temporary API Endpoint (If needed)

If you can't access Railway CLI, you could create a temporary admin-only API endpoint:

**DON'T COMMIT THIS TO PRODUCTION LONG-TERM**

Create `app/api/admin/backfill-customer-numbers/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  // Only allow admins
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leadsWithoutNumber = await prisma.lead.findMany({
      where: { customerNumber: null },
      orderBy: { createdAt: "asc" },
    });

    const leadWithHighestNumber = await prisma.lead.findFirst({
      where: { customerNumber: { not: null } },
      orderBy: { customerNumber: "desc" },
      select: { customerNumber: true },
    });

    let startingNumber = 1;
    if (leadWithHighestNumber?.customerNumber) {
      const match = leadWithHighestNumber.customerNumber.match(/105-(\d+)/);
      if (match) startingNumber = parseInt(match[1], 10) + 1;
    }

    let updated = 0;
    for (let i = 0; i < leadsWithoutNumber.length; i++) {
      const lead = leadsWithoutNumber[i];
      const customerNumber = `105-${String(startingNumber + i).padStart(6, '0')}`;
      await prisma.lead.update({
        where: { id: lead.id },
        data: { customerNumber },
      });
      updated++;
    }

    return NextResponse.json({ 
      success: true, 
      updated,
      message: `Successfully backfilled ${updated} customer numbers`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

Then make a POST request:
```bash
curl -X POST https://your-app.up.railway.app/api/admin/backfill-customer-numbers \
  -H "Cookie: your-session-cookie"
```

**Remember to delete this endpoint after running!**

### Step 5: Verify Backfill Success

Check that customer numbers were assigned:

```bash
# Count leads with customer numbers
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM leads WHERE \"customerNumber\" IS NOT NULL;"

# View first 10 customer numbers
railway run psql $DATABASE_URL -c "SELECT id, \"customerNumber\", \"createdAt\" FROM leads ORDER BY \"createdAt\" ASC LIMIT 10;"

# Check for duplicates (should return 0)
railway run psql $DATABASE_URL -c "SELECT \"customerNumber\", COUNT(*) FROM leads WHERE \"customerNumber\" IS NOT NULL GROUP BY \"customerNumber\" HAVING COUNT(*) > 1;"
```

### Step 6: Test in Production

1. Visit your production app
2. Go to the leads list page
3. Verify:
   - ✅ Customer Number column appears as the first column
   - ✅ All existing leads have customer numbers (105-000001, etc.)
   - ✅ Customer numbers are displayed in monospace font
   
4. Click on a lead detail page
5. Verify:
   - ✅ Customer number shows in the header (next to customer name)
   - ✅ Customer number shows in the Lead Information card

6. Create a new test lead
7. Verify:
   - ✅ New lead gets the next sequential customer number
   - ✅ No errors in the browser console

### Step 7: Monitor for Issues

After deployment, monitor for:

```bash
# Watch application logs
railway logs --follow

# Look for any errors related to:
# - Customer number generation
# - Unique constraint violations
# - Migration issues
```

---

## Safety Checks

### Before Deployment

- [ ] Local database migration successful
- [ ] Local backfill script tested successfully
- [ ] All TypeScript/ESLint errors resolved
- [ ] Changes committed to git
- [ ] Backup plan documented below

### After Deployment

- [ ] Migration applied successfully in production
- [ ] Backfill completed without errors
- [ ] All existing leads have customer numbers
- [ ] New leads get sequential numbers
- [ ] No duplicate customer numbers exist
- [ ] UI displays customer numbers correctly

---

## Rollback Plan

If something goes wrong, here's how to rollback:

### Quick Rollback (Revert Deployment)

1. In Railway dashboard, go to **Deployments**
2. Find the previous successful deployment (before this change)
3. Click **"Redeploy"** on that deployment
4. This will revert your app to the previous version

### Manual Database Rollback (If needed)

If you need to remove the customer number field from the database:

```bash
# Connect to production database
railway run psql $DATABASE_URL

# Remove the column (this will delete all customer numbers!)
DROP INDEX IF EXISTS "leads_customerNumber_idx";
DROP INDEX IF EXISTS "leads_customerNumber_key";
ALTER TABLE "leads" DROP COLUMN "customerNumber";

# Exit
\q
```

Then revert your code changes and redeploy.

### Partial Rollback (Keep Migration, Remove UI)

If the migration worked but UI has issues:
1. Keep the database changes
2. Just revert the UI changes in your code
3. Redeploy

The customer numbers will remain in the database but won't display.

---

## Troubleshooting

### Migration Fails

**Error**: Migration failed to apply

**Solution**:
```bash
# Check migration status
railway run npx prisma migrate status

# If migration is pending, apply it manually
railway run npx prisma migrate deploy

# Check for migration errors
railway logs | grep -i "prisma\|migration"
```

### Backfill Script Fails

**Error**: Script times out or crashes

**Solution**: Run the backfill in batches:

```typescript
// Modify backfill script to process in batches
const BATCH_SIZE = 100;
for (let i = 0; i < leadsWithoutNumber.length; i += BATCH_SIZE) {
  const batch = leadsWithoutNumber.slice(i, i + BATCH_SIZE);
  await Promise.all(
    batch.map((lead, idx) => {
      const customerNumber = `105-${String(startingNumber + i + idx).padStart(6, '0')}`;
      return prisma.lead.update({
        where: { id: lead.id },
        data: { customerNumber },
      });
    })
  );
  console.log(`Processed ${i + BATCH_SIZE}/${leadsWithoutNumber.length}`);
}
```

### Duplicate Customer Numbers

**Error**: Unique constraint violation

**Solution**:
```bash
# Find and fix duplicates
railway run psql $DATABASE_URL <<SQL
-- Find duplicates
SELECT "customerNumber", COUNT(*) 
FROM leads 
WHERE "customerNumber" IS NOT NULL 
GROUP BY "customerNumber" 
HAVING COUNT(*) > 1;

-- Clear all customer numbers and re-run backfill
UPDATE leads SET "customerNumber" = NULL;
SQL

# Then re-run backfill script
railway run npx tsx scripts/backfill-customer-numbers.ts
```

### Customer Numbers Not Showing in UI

**Check**:
1. Clear browser cache / hard refresh (Cmd+Shift+R)
2. Check that the field is in the API response:
   ```bash
   # Test the API
   curl https://your-app.up.railway.app/api/leads \
     -H "Cookie: your-session-cookie"
   ```
3. Check browser console for errors

---

## Post-Deployment Tasks

After successful deployment:

1. **Update Team**: Notify team about the new customer number feature
2. **Documentation**: Share this guide with the team
3. **Training**: Show team how customer numbers appear in the UI
4. **Monitoring**: Watch for any customer number-related issues over the next few days
5. **Cleanup**: If you created a temporary API endpoint for backfill, remove it

---

## Estimated Timeline

- **Code Deployment**: 2-5 minutes (automatic via Railway)
- **Migration Execution**: < 30 seconds (included in deployment)
- **Backfill Script**: ~1-5 seconds per 100 leads
- **Testing & Verification**: 5-10 minutes
- **Total**: ~10-20 minutes

---

## Support Commands

Useful commands for managing customer numbers in production:

```bash
# Count leads by customer number status
railway run psql $DATABASE_URL -c "
  SELECT 
    COUNT(CASE WHEN \"customerNumber\" IS NOT NULL THEN 1 END) as with_number,
    COUNT(CASE WHEN \"customerNumber\" IS NULL THEN 1 END) as without_number,
    COUNT(*) as total
  FROM leads;
"

# Get the highest customer number
railway run psql $DATABASE_URL -c "
  SELECT \"customerNumber\" 
  FROM leads 
  WHERE \"customerNumber\" IS NOT NULL 
  ORDER BY \"customerNumber\" DESC 
  LIMIT 1;
"

# Find gaps in customer numbers (if any)
railway run psql $DATABASE_URL -c "
  SELECT 
    \"customerNumber\",
    CAST(SUBSTRING(\"customerNumber\" FROM 5) AS INTEGER) as num
  FROM leads 
  WHERE \"customerNumber\" IS NOT NULL
  ORDER BY num;
"
```

---

## Quick Reference

### Deployment Checklist

```bash
# 1. Push to git
git push origin main

# 2. Wait for Railway deployment (automatic)

# 3. Run backfill
railway run npx tsx scripts/backfill-customer-numbers.ts

# 4. Verify
railway run psql $DATABASE_URL -c "SELECT COUNT(*) FROM leads WHERE \"customerNumber\" IS NOT NULL;"

# 5. Test in browser
# Visit: https://your-app.up.railway.app/leads
```

### Emergency Rollback

```bash
# Revert to previous deployment in Railway dashboard
# OR remove the column:
railway run psql $DATABASE_URL -c "ALTER TABLE leads DROP COLUMN \"customerNumber\";"
```

---

## Questions or Issues?

If you encounter any issues during deployment:

1. Check Railway logs: `railway logs --follow`
2. Check database status: `railway run npx prisma migrate status`
3. Verify environment variables are set correctly
4. Review this guide's troubleshooting section

Remember: The migration is safe and backward-compatible. The customerNumber field is nullable, so existing functionality won't break even if the backfill doesn't complete immediately.
