# Full Deployment Assessment - Production Ready Checklist

**⚠️ CRITICAL: This is a MAJOR feature deployment with database schema changes**

## Overview

This deployment includes a **complete notifications and tasks system** with significant database schema changes, new API endpoints, cron jobs, and UI improvements.

## Scope of Changes

### 1. Database Schema Changes ⚠️ **REQUIRES MIGRATION**

**New Models:**

- `Notification` model with enums: `NotificationType` (LEAD_INACTIVITY, ADMIN_COMMENT)
- `Task` model with enums: `TaskType` (LEAD_INACTIVITY), `TaskStatus` (PENDING, ACKNOWLEDGED, RESOLVED)

**New Relations:**

- User → Notifications (one-to-many)
- User → Tasks (one-to-many)
- Lead → Notifications (one-to-many)
- Lead → Tasks (one-to-many)
- LeadNote → Notifications (one-to-many)
- Task → Notification (one-to-one)

**Indexes Added:**

- `notifications`: userId+read, userId+acknowledged, userId+createdAt, leadId
- `tasks`: userId+status, leadId, unique(leadId+type)

**⚠️ ACTION REQUIRED: Create migration before deployment!**

```bash
npx prisma migrate dev --name add_notifications_and_tasks
```

### 2. New API Endpoints

**Notifications:**

- `GET /api/notifications` - List user notifications
- `PATCH /api/notifications/[id]/read` - Mark as read
- `PATCH /api/notifications/[id]/acknowledge` - Acknowledge notification
- `PATCH /api/notifications/read-all` - Mark all as read

**Tasks:**

- `GET /api/tasks` - List tasks (with pagination, filtering)
- `GET /api/tasks/[id]` - Get single task
- `PATCH /api/tasks/[id]/acknowledge` - Acknowledge task
- `PATCH /api/tasks/[id]/resolve` - Resolve task

**Cron Job:**

- `POST /api/cron/check-inactivity` - Check for 48-hour inactive leads
  - **Requires**: `CRON_SECRET` environment variable
  - **Protected**: X-Cron-Secret header validation

**Admin:**

- `GET /api/admin/follow-ups` - Admin view of inactive leads by sales rep

### 3. New Features

**Notifications System:**

- Real-time notification bell in header (desktop)
- Mobile-friendly dashboard notifications card
- Lead inactivity alerts (48+ hours)
- Admin comment notifications
- Auto-delete acknowledged ADMIN_COMMENT notifications
- Polling for real-time updates

**Tasks System:**

- Lead inactivity tasks
- Task acknowledgment and resolution
- Task filtering and pagination
- Admin task management

**Lead Activity Tracking:**

- New `lib/lead-activity.ts` utility
- Tracks: lead updates, notes, appointments, quotes
- Used for inactivity detection

**Admin Follow-ups:**

- Admin dashboard for tracking inactive leads
- Grouped by sales rep
- Statistics and filtering

### 4. UI Changes

**App Shell (`components/app-shell.tsx`):**

- Notification bell with badge count
- Notification dropdown (desktop only)
- Mobile: Bell hidden, notifications shown on dashboard

**Dashboard (`app/(protected)/dashboard/page.tsx`):**

- Mobile notifications card (new)
- Shows up to 3 recent notifications
- "Go to Tasks Page" button

**Tasks Page (`app/(protected)/tasks/page.tsx`):**

- Complete task management UI
- Filtering by sales rep (admin)
- Pagination
- Task acknowledgment/resolution

**Admin Content (`app/(protected)/admin/AdminContent.tsx`):**

- Admin follow-ups view

### 5. Modified Files

**Modified:**

- `app/(protected)/admin/AdminContent.tsx` - Admin follow-ups
- `app/(protected)/dashboard/page.tsx` - Mobile notifications
- `app/(protected)/tasks/page.tsx` - Task management UI
- `app/api/leads/[id]/notes/route.ts` - Admin comment notifications
- `components/app-shell.tsx` - Notification bell & mobile handling
- `package.json` - Added cron script
- `prisma/schema.prisma` - Notification & Task models

**New Files:**

- `app/api/admin/follow-ups/route.ts`
- `app/api/cron/check-inactivity/route.ts`
- `app/api/notifications/` (4 endpoints)
- `app/api/tasks/` (4 endpoints)
- `components/admin-follow-ups.tsx`
- `components/notifications-list.tsx`
- `lib/lead-activity.ts`
- `scripts/check-inactivity.ts`

## Pre-Deployment Checklist

### ⚠️ CRITICAL: Database Migration

- [ ] **MANDATORY: Create migration for Notification and Task models**
  ```bash
  npx prisma migrate dev --name add_notifications_and_tasks
  ```
- [ ] Review migration SQL file carefully
- [ ] Test migration on local database
- [ ] Verify migration is idempotent (safe to run multiple times)
- [ ] Check for any data loss risks
- [ ] Document rollback plan for migration

### Environment Variables

- [ ] **NEW REQUIRED**: `CRON_SECRET` - Secret token for cron job authentication
  ```bash
  # Generate a secure secret:
  openssl rand -base64 32
  ```
- [ ] Verify `DATABASE_URL` is set
- [ ] Verify `NEXTAUTH_URL` is set
- [ ] Verify `NEXTAUTH_SECRET` is set

### Railway Cron Job Setup

- [ ] **MANDATORY: Configure Railway cron job**
  - See `docs/RAILWAY_CRON_SETUP.md` for details
  - Set up daily cron job to call `/api/cron/check-inactivity`
  - Configure `CRON_SECRET` header
  - Test cron job execution

### Code Review

- [ ] All new API endpoints reviewed
- [ ] Security review completed (authentication, authorization)
- [ ] Error handling verified
- [ ] TypeScript types correct
- [ ] No console.log statements (console.error is OK)
- [ ] Linting passes: `npm run lint`
- [ ] Build succeeds: `npm run build`

### Testing

**Local Testing:**

- [ ] Notification creation works
- [ ] Notification display works (desktop & mobile)
- [ ] Task creation works
- [ ] Task management works
- [ ] Cron job script runs successfully
- [ ] Admin follow-ups view works
- [ ] Lead activity tracking works
- [ ] Admin comment notifications work

**Integration Testing:**

- [ ] End-to-end notification flow
- [ ] End-to-end task flow
- [ ] Cron job creates notifications/tasks correctly
- [ ] No duplicate notifications/tasks created
- [ ] Cascade deletes work correctly

## Deployment Steps

### 1. Pre-Deployment Backup

- [ ] **MANDATORY: Backup production database**
  ```bash
  railway run pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```
- [ ] Verify backup file exists and is valid
- [ ] Store backup in secure location

### 2. Create and Commit Migration

- [ ] Create migration:
  ```bash
  npx prisma migrate dev --name add_notifications_and_tasks
  ```
- [ ] Review migration SQL
- [ ] Commit migration file:
  ```bash
  git add prisma/migrations/
  git commit -m "Add notifications and tasks migration"
  ```

### 3. Deploy to Railway

- [ ] Push to main branch:
  ```bash
  git push origin main
  ```
- [ ] Railway will automatically:
  - Run `prisma migrate deploy` (applies migration)
  - Build application
  - Deploy to production

### 4. Monitor Deployment

- [ ] Watch Railway deployment logs
- [ ] Verify migration applies successfully
- [ ] Verify build completes
- [ ] Verify application starts
- [ ] Check for errors in logs

### 5. Post-Deployment Verification

**Immediate (First 5 minutes):**

- [ ] Application accessible
- [ ] Can sign in
- [ ] Notification bell visible (desktop)
- [ ] Dashboard notifications card visible (mobile)
- [ ] Tasks page accessible
- [ ] Admin follow-ups page accessible
- [ ] No JavaScript errors
- [ ] No 500 errors

**Functional (First 15 minutes):**

- [ ] Create a test notification (if possible)
- [ ] Verify notification displays
- [ ] Test notification acknowledgment
- [ ] Test task creation (via cron or manual)
- [ ] Test task acknowledgment/resolution
- [ ] Test admin follow-ups view
- [ ] Verify cron job can be called (with secret)

**Database (First 30 minutes):**

- [ ] Check migration status:
  ```bash
  railway run npx prisma migrate status
  ```
- [ ] Verify `notifications` table exists
- [ ] Verify `tasks` table exists
- [ ] Verify indexes created
- [ ] Verify foreign keys work
- [ ] Test data insertion

**Cron Job (First 24 hours):**

- [ ] Verify cron job runs successfully
- [ ] Check Railway cron logs
- [ ] Verify notifications/tasks created correctly
- [ ] Verify no duplicate entries

## Rollback Plan

### If Migration Fails

1. **Stop deployment immediately**
2. **DO NOT run `prisma migrate reset`** (deletes all data!)
3. Check migration status:
   ```bash
   railway run npx prisma migrate status
   ```
4. If migration partially applied:
   - Review migration SQL
   - Manually fix database state if needed
   - Or restore from backup
5. Fix migration and redeploy

### If Application Fails

1. Revert to previous deployment in Railway dashboard
2. If migration was applied, you may need to:
   - Manually drop new tables (if safe)
   - Or restore from backup
3. Fix code issues
4. Redeploy

### Rollback Commands

```bash
# Revert to previous deployment
# Use Railway dashboard: Deployments → Previous → Redeploy

# Check migration status
railway run npx prisma migrate status

# View database tables
railway run psql $DATABASE_URL -c "\dt"

# Restore from backup (if needed)
railway run psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

## Risk Assessment

**Risk Level: HIGH** ⚠️

**Reasons:**

- Database schema changes (new tables, indexes, foreign keys)
- New cron job requires configuration
- New environment variable required
- Complex feature with multiple components
- Affects core lead management workflow

**Mitigation:**

- ✅ Comprehensive testing checklist
- ✅ Database backup mandatory
- ✅ Migration review required
- ✅ Staged deployment recommended
- ✅ Monitoring plan in place

## Success Criteria

Deployment is successful when:

- ✅ Migration applied successfully
- ✅ Application builds and starts
- ✅ All new endpoints work
- ✅ Notifications system functional
- ✅ Tasks system functional
- ✅ Cron job configured and running
- ✅ No errors in logs
- ✅ No user-reported issues after 24 hours

## Timeline Estimate

- **Pre-deployment**: 1-2 hours (migration creation, testing, backup)
- **Deployment**: 10-15 minutes (Railway auto-deploy)
- **Post-deployment verification**: 30-60 minutes
- **Monitoring period**: 24 hours

## Emergency Contacts

- Database admin: [Document contact]
- Railway support: [Document contact]
- Team lead: [Document contact]

---

**Last Updated**: [Date]
**Deployment Type**: Major Feature (Database Migration Required)
**Risk Level**: HIGH
**Estimated Downtime**: 0-5 minutes (during migration)
