# Quick Fix: Resolve Failed Migration

Run these commands to fix the build failure:

```bash
# 1. Install Railway CLI (if not already installed)
npm i -g @railway/cli

# 2. Login to Railway
railway login

# 3. Link to your project
railway link

# 4. Check migration status
railway run npx prisma migrate status

# 5. Resolve the failed migration (mark as applied)
railway run npx prisma migrate resolve --applied add_performance_indexes

# 6. Verify it's resolved
railway run npx prisma migrate status

# 7. Now trigger a new deployment (or push a small change)
# The build should now succeed!
```

After step 5, Railway should be able to continue with the new migrations.

## Why This Works

The `add_performance_indexes` migration uses `CREATE INDEX IF NOT EXISTS`, which means:
- If indexes already exist, nothing happens (safe)
- If they don't exist, they get created (safe)
- Marking it as "applied" is safe because the SQL is idempotent

## Alternative: If Railway CLI Doesn't Work

You can also modify the build script temporarily to resolve and continue, but the CLI method above is cleaner.

