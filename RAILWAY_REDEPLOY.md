# Railway Redeployment Guide

This guide covers redeploying your HomebaseCRM app to Railway with all the latest updates, including the new referral tracking features.

## Pre-Deployment Checklist

### ✅ 1. Code is Committed

Your working tree is clean - all changes are committed to git.

### ✅ 2. New Migrations Created

Several migrations have been created to sync the database with the current schema:

1. **`1_update_lead_type_enum`** - Adds missing LeadType enum values (CARPET, PAINTING, LANDSCAPING, MONTHLY_YARD_MAINTENANCE, ROOFING, STUCCO, ADUS)

2. **`2_convert_leadtype_to_array`** - Converts `leadType` (single) to `leadTypes` (array) to support multiple lead types per lead

3. **`3_add_user_password`** - Adds `password` field to `users` table for authentication

4. **`add_referral_tracking`** - Adds referral tracking fields to `leads` table:
   - `referrerFirstName`, `referrerLastName`, `referrerPhone`, `referrerEmail`
   - `referrerCustomerId` and `referrerIsCustomer`
   - Foreign key relationship to `customers` table

**Migration Order:** These will run in alphabetical order, which is correct:

1. `0_init` (already applied)
2. `1_update_lead_type_enum` (must run before array conversion)
3. `2_convert_leadtype_to_array` (needs updated enum)
4. `3_add_user_password`
5. `add_performance_indexes` (already applied)
6. `add_referral_tracking`
7. `add_user_invitations` (already applied)

## Deployment Steps

### Step 1: Commit and Push Migration

If you haven't already, commit the new migration:

```bash
git add prisma/migrations/
git commit -m "Add database migrations: LeadType enum, leadTypes array, user password, referral tracking"
git push origin main
```

**Note:** Railway automatically deploys when you push to your connected branch (usually `main`).

### Step 2: Verify Railway Environment Variables

In your Railway dashboard:

1. Go to your **app service** (not the database service)
2. Click on the **"Variables"** tab
3. Verify these variables are set:

#### Required Variables:

- ✅ `DATABASE_URL` - Automatically set by Railway (from your PostgreSQL service)
- ✅ `NEXTAUTH_URL` - Should be your Railway app URL (e.g., `https://your-app-name.up.railway.app`)
- ✅ `NEXTAUTH_SECRET` - A secure random string (generate with: `openssl rand -base64 32`)

**Important:**

- `NEXTAUTH_URL` must match your actual Railway app URL exactly
- If you changed your app URL, update `NEXTAUTH_URL` accordingly

### Step 3: Monitor Deployment

1. Go to your Railway project dashboard
2. Click on your **app service**
3. Watch the **"Deployments"** tab for the latest deployment
4. Click on the deployment to see build logs

#### What Happens During Build:

Your `package.json` build script runs:

```bash
prisma migrate deploy && tsx scripts/seed-once.ts && next build
```

This will:

1. ✅ Run `prisma migrate deploy` - Applies all pending migrations (including the new referral tracking migration)
2. ✅ Run `tsx scripts/seed-once.ts` - Seeds initial data if needed
3. ✅ Run `next build` - Builds your Next.js app

### Step 4: Verify Migration Success

Check the build logs to ensure:

- ✅ `prisma migrate deploy` completed successfully
- ✅ No migration errors
- ✅ Build completed successfully

If you see migration errors, you can manually run migrations using Railway CLI:

```bash
# Install Railway CLI (if not already installed)
npm i -g @railway/cli

# Login and link your project
railway login
railway link

# Run migrations manually
railway run npm run db:migrate:deploy
```

### Step 5: Verify Database Schema

After deployment, verify the migration was applied:

```bash
# Using Railway CLI
railway run npx prisma migrate status
```

Or check via Prisma Studio:

```bash
railway run npm run db:studio
# Then open the forwarded port in your browser
```

### Step 6: Test the Deployed App

1. Visit your Railway app URL
2. Sign in with:
   - Email: `admin@homebasecrm.com`
   - Password: (any password)
3. Test the new referral tracking features:
   - Create a new lead with `sourceType = "REFERRAL"`
   - Verify referrer fields are saved correctly
   - Check that referrer information displays on lead detail page

## Troubleshooting

### Migration Fails During Build

**Error:** Migration conflicts or errors

**Solution:**

1. Check Railway build logs for specific error
2. If needed, run migrations manually:
   ```bash
   railway run npm run db:migrate:deploy
   ```
3. If migration conflicts exist, you may need to reset (⚠️ **WARNING:** This deletes data):
   ```bash
   railway run npx prisma migrate reset
   ```

### Database Connection Issues

**Error:** Cannot connect to database

**Solution:**

1. Verify PostgreSQL service is running in Railway dashboard
2. Check `DATABASE_URL` is set correctly in app service variables
3. Ensure database service and app service are in the same Railway project

### Build Fails

**Error:** Build command fails

**Solution:**

1. Check build logs for specific error
2. Verify all dependencies are in `dependencies` (not `devDependencies`)
3. Ensure `postinstall` script runs (generates Prisma Client)
4. Check Node.js version compatibility

### App Won't Start

**Error:** App crashes on startup

**Solution:**

1. Check Railway logs: `railway logs`
2. Verify environment variables are set correctly
3. Ensure `NEXTAUTH_URL` matches your app URL exactly
4. Check database migrations completed successfully

## Post-Deployment Verification

After successful deployment:

- [ ] App loads at Railway URL
- [ ] Can sign in successfully
- [ ] Database migrations applied (check `prisma migrate status`)
- [ ] Referral tracking fields work correctly
- [ ] Can create leads with referral information
- [ ] Referrer information displays on lead detail pages

## Rollback (If Needed)

If something goes wrong:

1. In Railway dashboard, go to **Deployments**
2. Find the previous working deployment
3. Click **"Redeploy"** to rollback

Or use Railway CLI:

```bash
railway rollback
```

## Next Steps

After successful deployment:

- Monitor app performance and errors
- Set up monitoring/alerts if needed
- Consider setting up database backups
- Test all new referral tracking features in production

## Quick Reference Commands

```bash
# View Railway logs
railway logs

# Run migrations manually
railway run npm run db:migrate:deploy

# Check migration status
railway run npx prisma migrate status

# Open Prisma Studio
railway run npm run db:studio

# View environment variables
railway variables

# Connect to database shell
railway run psql $DATABASE_URL
```
