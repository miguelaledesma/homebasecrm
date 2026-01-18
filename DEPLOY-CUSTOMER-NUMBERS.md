# 🚀 Quick Deploy: Customer Numbers Feature

## TL;DR - Production Deployment

### 1️⃣ Push to Production
```bash
git add .
git commit -m "feat: Add customer numbers to leads"
git push origin main
```

### 2️⃣ Wait for Railway Auto-Deploy
- Railway automatically runs the migration ✅
- Takes ~2-5 minutes
- Watch progress in Railway dashboard

### 3️⃣ Backfill Existing Leads
```bash
# Install Railway CLI if you haven't
npm i -g @railway/cli

# Login and link (one-time setup)
railway login
railway link

# Run the backfill script
railway run npm run db:backfill-customer-numbers
```

Expected output:
```
Starting customer number backfill...
Found X leads without customer numbers
Starting numbering from: 105-000001
✅ Successfully backfilled X customer numbers
```

### 4️⃣ Verify
```bash
# Check that leads have customer numbers
railway run psql $DATABASE_URL -c \
  "SELECT COUNT(*) FROM leads WHERE \"customerNumber\" IS NOT NULL;"
```

### 5️⃣ Test
Visit your production app and check:
- ✅ Leads list shows Customer # column
- ✅ Lead details show customer number
- ✅ Create a new lead → gets next number

## Done! 🎉

---

## What Happens Automatically

✅ **Migration runs** - Railway build includes `prisma migrate deploy`  
✅ **Column added** - `customerNumber` field created in database  
✅ **Indexes created** - Unique constraint and search index added  
✅ **New leads work** - API auto-generates numbers for new leads  

## What You Must Do Manually

⚠️ **Backfill** - Run the script to add numbers to existing leads  
⚠️ **Verify** - Check that everything works in production  

---

## Alternative: No Railway CLI?

If you can't use Railway CLI, use the Railway dashboard:

1. Go to your project in Railway
2. Click on your app service
3. Go to "Deployments" tab
4. Click the latest deployment
5. Look for "Service Settings" → "One-off Commands"
6. Run: `npx tsx scripts/backfill-customer-numbers.ts`

---

## Rollback (If Needed)

In Railway dashboard:
1. Go to "Deployments"
2. Find previous deployment (before this change)
3. Click "Redeploy"

---

## Full Documentation

See `docs/CUSTOMER_NUMBER_PRODUCTION_DEPLOY.md` for:
- Detailed step-by-step guide
- Troubleshooting
- Safety checks
- Emergency procedures

---

## Quick Checks

```bash
# Login to Railway (one-time)
railway login
railway link

# Check if migration ran
railway run npx prisma migrate status

# Run backfill
railway run npm run db:backfill-customer-numbers

# Check results
railway run psql $DATABASE_URL -c \
  "SELECT \"customerNumber\", COUNT(*) FROM leads GROUP BY \"customerNumber\" ORDER BY \"customerNumber\" LIMIT 10;"

# Watch logs
railway logs --follow
```

---

**Questions?** Check `docs/CUSTOMER_NUMBER_PRODUCTION_DEPLOY.md`
