# Fix Failed Migration Issue

## Problem
The `add_performance_indexes` migration failed, blocking all new migrations from being applied.

## Solution: Resolve the Failed Migration

You need to mark the failed migration as resolved. Since the migration uses `CREATE INDEX IF NOT EXISTS`, it's safe to mark it as applied (the indexes likely already exist or will be created safely).

### Step 1: Check Migration Status

```bash
railway run npx prisma migrate status
```

This will show you which migrations are applied and which failed.

### Step 2: Resolve the Failed Migration

Mark the failed migration as applied (if indexes exist) or rolled back:

**Option A: Mark as Applied** (if indexes were created)
```bash
railway run npx prisma migrate resolve --applied add_performance_indexes
```

**Option B: Mark as Rolled Back** (if you want to retry it)
```bash
railway run npx prisma migrate resolve --rolled-back add_performance_indexes
```

Since the migration uses `IF NOT EXISTS`, **Option A is recommended** - the indexes are likely already there.

### Step 3: Verify and Continue

After resolving:
```bash
# Check status again
railway run npx prisma migrate status

# Try deploying again - migrations should now apply
```

## Alternative: Manual Fix via Database

If Railway CLI doesn't work, you can manually fix via database:

1. Connect to your Railway database
2. Check if indexes exist
3. Manually mark migration as resolved in `_prisma_migrations` table

But the CLI method above is easier and safer.

