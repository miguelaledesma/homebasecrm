# Production Deployment Checklist

**⚠️ CRITICAL: This is a MAJOR feature deployment with database schema changes affecting LIVE customer data.**

## ⚠️ IMPORTANT: This deployment includes:
- **NEW DATABASE TABLES**: `notifications` and `tasks` (requires migration)
- **NEW API ENDPOINTS**: Notifications, tasks, cron job, admin follow-ups
- **NEW ENVIRONMENT VARIABLE**: `CRON_SECRET` (required)
- **NEW CRON JOB**: Must be configured in Railway
- **UI CHANGES**: Mobile notifications, task management

**See `docs/FULL_DEPLOYMENT_ASSESSMENT.md` for complete details.**

## Pre-Deployment Phase

### 1. Code Review & Testing ✅
- [ ] All code changes reviewed and approved
- [ ] All tests pass locally
- [ ] Manual testing completed on staging/local environment
- [ ] Mobile view tested (notification bell hidden, dashboard notifications visible)
- [ ] Desktop view tested (notification bell works correctly)
- [ ] Notification functionality tested end-to-end
- [ ] Task management tested end-to-end
- [ ] Cron job script tested locally
- [ ] Admin follow-ups tested
- [ ] No console errors or warnings
- [ ] No TypeScript errors (`npm run build` succeeds)

### 2. Database Migration - ⚠️ CRITICAL STEP 🔍
- [ ] **MANDATORY: Create migration for Notification and Task models**
  ```bash
  # The schema has new models but no migration file exists!
  npx prisma migrate dev --name add_notifications_and_tasks
  ```
- [ ] Review the generated migration SQL file carefully
- [ ] Verify migration includes:
  - [ ] `notifications` table with all columns
  - [ ] `tasks` table with all columns
  - [ ] All enum types (NotificationType, TaskType, TaskStatus)
  - [ ] All indexes (userId+read, userId+acknowledged, etc.)
  - [ ] All foreign key constraints
  - [ ] Cascade delete rules
- [ ] Test migration on local database:
  ```bash
  # Reset local DB and apply migration
  npx prisma migrate reset
  npx prisma migrate deploy
  ```
- [ ] Verify migration is idempotent (safe to run multiple times)
- [ ] Check for any data loss risks (none expected - new tables only)
- [ ] Document rollback plan (drop tables if needed)
- [ ] Commit migration file to git:
  ```bash
  git add prisma/migrations/
  git commit -m "Add notifications and tasks migration"
  ```

### 3. Backup Database 🛡️
- [ ] **MANDATORY: Create database backup before deployment**
  ```bash
  # Using Railway CLI
  railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  
  # Or via Railway dashboard:
  # 1. Go to PostgreSQL service
  # 2. Click "Data" tab
  # 3. Export database backup
  ```
- [ ] Verify backup file exists and is not empty
- [ ] Store backup in secure location
- [ ] Document backup location and timestamp

### 4. Environment Variables Check 🔐
- [ ] Verify all required environment variables are set in Railway:
  - [ ] `DATABASE_URL` (auto-set by Railway)
  - [ ] `NEXTAUTH_URL` (matches production URL)
  - [ ] `NEXTAUTH_SECRET` (secure random string)
  - [ ] **NEW REQUIRED**: `CRON_SECRET` - Generate secure token:
    ```bash
    openssl rand -base64 32
    ```
    - This is used to protect the cron job endpoint
    - Must be set in Railway environment variables
    - Must match the secret used in Railway cron job configuration

### 5. Build Verification 🏗️
- [ ] Local build succeeds without errors:
  ```bash
  npm run build
  ```
- [ ] No TypeScript compilation errors
- [ ] No missing dependencies
- [ ] Prisma Client generates successfully

## Deployment Phase

### 6. Pre-Deployment Verification ✅
- [ ] All checklist items above completed
- [ ] Team notified of deployment window
- [ ] Deployment scheduled during low-traffic period (if possible)
- [ ] Rollback plan documented and ready

### 7. Deploy to Railway 🚀

#### Option A: Automatic Deployment (Recommended)
- [ ] Push code to main branch:
  ```bash
  git add .
  git commit -m "feat: Mobile-friendly notifications - hide bell on mobile, show on dashboard"
  git push origin main
  ```
- [ ] Railway will automatically:
  - Detect the push
  - Start new deployment
  - Run `prisma migrate deploy` (if migrations exist)
  - Build the application
  - Deploy to production

#### Option B: Manual Deployment (If needed)
- [ ] Use Railway dashboard to trigger deployment
- [ ] Or use Railway CLI:
  ```bash
  railway up
  ```

### 8. Monitor Deployment 📊
- [ ] Watch Railway deployment logs in real-time
- [ ] Verify build completes successfully
- [ ] Check for any migration errors (should be none for this PR)
- [ ] Verify application starts without errors
- [ ] Check application logs for runtime errors

## Post-Deployment Phase

### 9. Immediate Verification (First 5 minutes) ⚡
- [ ] Application is accessible at production URL
- [ ] Can sign in successfully
- [ ] **Mobile view**: Notification bell is hidden
- [ ] **Mobile view**: Dashboard shows notifications section
- [ ] **Mobile view**: "Go to Tasks Page" button works
- [ ] **Desktop view**: Notification bell works correctly
- [ ] **Desktop view**: Notification dropdown displays properly
- [ ] No JavaScript errors in browser console
- [ ] No 500 errors in server logs

### 10. Functional Testing (First 15 minutes) 🧪
- [ ] Test notification creation (if applicable)
- [ ] Test notification display on mobile dashboard
- [ ] Test navigation to tasks page from dashboard
- [ ] Test notification bell on desktop
- [ ] Test notification dropdown on desktop
- [ ] Test notification acknowledgment
- [ ] Test notification read/unread states
- [ ] Verify all existing features still work

### 11. Database Verification 🗄️ **MANDATORY**
- [ ] Check migration status:
  ```bash
  railway run npx prisma migrate status
  ```
- [ ] Verify `add_notifications_and_tasks` migration applied successfully
- [ ] Verify `notifications` table exists:
  ```bash
  railway run psql $DATABASE_URL -c "\d notifications"
  ```
- [ ] Verify `tasks` table exists:
  ```bash
  railway run psql $DATABASE_URL -c "\d tasks"
  ```
- [ ] Verify all indexes created correctly
- [ ] Verify foreign key constraints work
- [ ] Test inserting a test notification (then delete it)
- [ ] Test inserting a test task (then delete it)
- [ ] Check database schema matches expected state
- [ ] Verify no data corruption
- [ ] Check application can read/write to new tables

### 12. Cron Job Verification ⏰ **MANDATORY**
- [ ] Verify `CRON_SECRET` environment variable is set in Railway
- [ ] Test cron endpoint manually (with correct secret):
  ```bash
  curl -X POST https://your-app.up.railway.app/api/cron/check-inactivity \
    -H "X-Cron-Secret: your-secret-here"
  ```
- [ ] Verify Railway cron job is configured (see `docs/RAILWAY_CRON_SETUP.md`)
- [ ] Check cron job schedule (should run daily)
- [ ] Verify cron job can authenticate (returns 200, not 401)
- [ ] Monitor first cron job execution (within 24 hours)
- [ ] Verify cron job creates notifications/tasks correctly
- [ ] Verify no duplicate notifications/tasks created

### 13. Performance Check 📈
- [ ] Page load times are acceptable
- [ ] No significant increase in API response times
- [ ] Database queries perform normally
- [ ] No memory leaks or resource issues

### 14. Monitoring (First Hour) 👀
- [ ] Monitor error rates (should be zero or baseline)
- [ ] Monitor application logs for warnings/errors
- [ ] Check Railway metrics (CPU, memory, requests)
- [ ] Monitor user activity (if possible)
- [ ] Watch for any user-reported issues

## Rollback Plan 🔄

### If Deployment Fails
1. **Immediate Actions:**
   - [ ] Stop new deployment if still in progress
   - [ ] Revert to previous deployment in Railway dashboard
   - [ ] Verify previous version is running

2. **If Database Migrations Were Applied:**
   - [ ] **DO NOT** run `prisma migrate reset` (this deletes all data!)
   - [ ] Check migration status: `railway run npx prisma migrate status`
   - [ ] If migration partially applied, check what was created:
     ```bash
     railway run psql $DATABASE_URL -c "\dt"  # List tables
     railway run psql $DATABASE_URL -c "\d notifications"  # Check notifications table
     railway run psql $DATABASE_URL -c "\d tasks"  # Check tasks table
     ```
   - [ ] If safe to rollback, drop new tables:
     ```bash
     railway run psql $DATABASE_URL -c "DROP TABLE IF EXISTS notifications CASCADE;"
     railway run psql $DATABASE_URL -c "DROP TABLE IF EXISTS tasks CASCADE;"
     railway run psql $DATABASE_URL -c "DROP TYPE IF EXISTS \"NotificationType\" CASCADE;"
     railway run psql $DATABASE_URL -c "DROP TYPE IF EXISTS \"TaskType\" CASCADE;"
     railway run psql $DATABASE_URL -c "DROP TYPE IF EXISTS \"TaskStatus\" CASCADE;"
     ```
   - [ ] Or restore from backup if data corruption occurred:
     ```bash
     railway run psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
     ```

3. **If Code Issues:**
   - [ ] Revert git commit
   - [ ] Push revert to trigger new deployment
   - [ ] Verify rollback deployment succeeds

### Rollback Commands
```bash
# Revert to previous deployment in Railway
# Use Railway dashboard: Deployments → Previous deployment → Redeploy

# Or via CLI (if available):
railway rollback

# Check current deployment status
railway status
```

## Emergency Contacts 📞
- [ ] Database admin contact information documented
- [ ] Railway support contact information available
- [ ] Team lead contact information available

## Post-Deployment Documentation 📝
- [ ] Document deployment time and duration
- [ ] Document any issues encountered and resolutions
- [ ] Update deployment log/history
- [ ] Notify team of successful deployment
- [ ] Schedule follow-up review (24 hours post-deployment)

## Critical Notes ⚠️

1. **⚠️ DATABASE MIGRATIONS REQUIRED**: This deployment includes new `notifications` and `tasks` tables. Migration must be created and committed before deployment.

2. **⚠️ NEW ENVIRONMENT VARIABLE**: `CRON_SECRET` must be set in Railway before deployment.

3. **⚠️ CRON JOB SETUP**: Railway cron job must be configured (see `docs/RAILWAY_CRON_SETUP.md`).

4. **Backup is Mandatory**: Always backup before deployment when dealing with production data.

5. **Monitor Closely**: Watch the first 24 hours after deployment for any issues, especially cron job execution.

6. **Rollback Ready**: Have rollback plan ready before starting deployment. Know how to drop new tables if needed.

7. **Low-Traffic Window**: If possible, deploy during low-traffic periods.

## Success Criteria ✅

Deployment is successful when:
- ✅ Migration applied successfully
- ✅ Application is accessible and functional
- ✅ `notifications` and `tasks` tables exist in database
- ✅ Mobile notifications work as expected (hidden bell, dashboard display)
- ✅ Desktop notifications work as expected (bell dropdown)
- ✅ Tasks page functional
- ✅ Admin follow-ups page functional
- ✅ Cron job configured and can be called successfully
- ✅ No errors in logs
- ✅ No user-reported issues after 24 hours
- ✅ All existing features continue to work

---

**Last Updated**: [Date]
**Deployment Type**: Major Feature (Database Migration Required)
**Risk Level**: HIGH (Schema changes, new features, cron job)
**See Also**: `docs/FULL_DEPLOYMENT_ASSESSMENT.md` for complete details

