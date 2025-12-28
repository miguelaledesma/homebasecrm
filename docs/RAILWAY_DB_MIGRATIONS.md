# Applying Database Migrations to Railway PostgreSQL

## Important: PostgreSQL is Persistent

Railway's PostgreSQL database is a **persistent service** - it doesn't need to be "redeployed". The database stays running and keeps all your data. You just need to **apply migrations** to update the schema.

## Method 1: Automatic (Recommended) ✅

Migrations run **automatically** when you deploy your app because your `package.json` build script includes:

```json
"build": "prisma migrate deploy && next build"
```

**Note:** The seed script is not included in the production build to protect live data. Seeding only happens in development mode.

### How It Works:

1. **Push your code** (including new migrations) to git
2. **Railway auto-deploys** your app
3. **During build**, `prisma migrate deploy` runs automatically
4. **All pending migrations** are applied to your Railway PostgreSQL database
5. **App builds and starts** with the updated schema

### Steps:

```bash
# 1. Commit all migrations
git add prisma/migrations/
git commit -m "Add database migrations"
git push origin main

# 2. Railway automatically:
#    - Detects the push
#    - Starts a new deployment
#    - Runs `prisma migrate deploy` (applies migrations)
#    - Builds your app
```

### Verify in Railway Dashboard:

1. Go to your Railway project
2. Click on your **app service**
3. Go to **"Deployments"** tab
4. Click on the latest deployment
5. Check the build logs - you should see:
   ```
   Running prisma migrate deploy...
   ✅ Applied migration: 1_update_lead_type_enum
   ✅ Applied migration: 2_convert_leadtype_to_array
   ✅ Applied migration: 3_add_user_password
   ✅ Applied migration: add_referral_tracking
   ```

## Method 2: Manual (If Needed)

If you need to run migrations manually (e.g., if automatic migration failed, or you want to test):

### Using Railway CLI:

```bash
# 1. Install Railway CLI (if not already installed)
npm i -g @railway/cli

# 2. Login to Railway
railway login

# 3. Link to your project (if not already linked)
railway link

# 4. Run migrations manually
railway run npm run db:migrate:deploy
```

This will:
- Connect to your Railway PostgreSQL database
- Apply all pending migrations
- Show you which migrations were applied

### Check Migration Status:

```bash
# See which migrations have been applied
railway run npx prisma migrate status
```

## Method 3: Direct Database Access (Advanced)

If you need direct access to your Railway PostgreSQL:

```bash
# Connect to database shell
railway run psql $DATABASE_URL

# Or view connection string
railway variables
```

Then you can run SQL directly, but **this is not recommended** - use Prisma migrations instead.

## Migration Order

Your migrations will run in this order (alphabetical):

1. ✅ `0_init` - Initial schema (already applied)
2. ✅ `1_update_lead_type_enum` - Adds missing enum values
3. ✅ `2_convert_leadtype_to_array` - Converts single leadType to array
4. ✅ `3_add_user_password` - Adds password field to users
5. ✅ `add_performance_indexes` - Performance indexes (already applied)
6. ✅ `add_referral_tracking` - Referral tracking fields
7. ✅ `add_user_invitations` - User invitations table (already applied)

## Troubleshooting

### Migration Fails During Build

**Error:** Migration conflicts or errors in build logs

**Solution:**
1. Check the specific error in Railway build logs
2. Run migrations manually to see detailed error:
   ```bash
   railway run npm run db:migrate:deploy
   ```
3. If there's a conflict, you may need to:
   - Check if migrations were partially applied
   - Verify database state: `railway run npx prisma migrate status`
   - Fix the migration SQL if needed

### Database Connection Issues

**Error:** Cannot connect to database during migration

**Solution:**
1. Verify `DATABASE_URL` is set in Railway app service variables
2. Check PostgreSQL service is running in Railway dashboard
3. Ensure app service and database service are in the same project

### Migration Already Applied

**Error:** "Migration already applied" or "No pending migrations"

**Solution:**
- This is normal if migrations were already applied
- Check status: `railway run npx prisma migrate status`
- If you see "Database schema is up to date", you're good!

### Need to Reset Database (⚠️ DANGEROUS)

**Warning:** This **deletes all data**!

```bash
# Only use if you need to start fresh (e.g., development/staging)
railway run npx prisma migrate reset
```

This will:
- Drop all tables
- Recreate database
- Run all migrations
- Run seed script

## Verify Migrations Applied

### Option 1: Check Migration Status

```bash
railway run npx prisma migrate status
```

Should show:
```
Database schema is up to date!

The following migration(s) have been applied:
✔ 0_init
✔ 1_update_lead_type_enum
✔ 2_convert_leadtype_to_array
✔ 3_add_user_password
✔ add_performance_indexes
✔ add_referral_tracking
✔ add_user_invitations
```

### Option 2: Use Prisma Studio

```bash
railway run npm run db:studio
```

Then open the forwarded port in your browser to visually inspect:
- Tables exist with correct columns
- Referral tracking fields are present
- `leadTypes` is an array column (not `leadType`)
- `users` table has `password` field

### Option 3: Check Build Logs

In Railway dashboard → App Service → Deployments → Latest deployment → Build logs

Look for:
```
✅ Applied migration: 1_update_lead_type_enum
✅ Applied migration: 2_convert_leadtype_to_array
✅ Applied migration: 3_add_user_password
✅ Applied migration: add_referral_tracking
```

## Quick Reference

```bash
# View migration status
railway run npx prisma migrate status

# Apply migrations manually
railway run npm run db:migrate:deploy

# View database (Prisma Studio)
railway run npm run db:studio

# Connect to database shell
railway run psql $DATABASE_URL

# View Railway logs
railway logs

# View environment variables
railway variables
```

## Summary

**For normal deployments:**
1. ✅ Just push your code (migrations included)
2. ✅ Railway automatically applies migrations during build
3. ✅ No manual steps needed!

**If something goes wrong:**
1. Use `railway run npm run db:migrate:deploy` to apply manually
2. Check `railway run npx prisma migrate status` to see what's applied
3. Review Railway build logs for errors

