# Notifications System - PR Checklist

This document outlines the steps to complete before creating a PR and merging the notifications system to main.

## ✅ Implementation Status

The notifications system has been implemented with:
- Database schema (Notification model with proper relationships)
- API endpoints for fetching, reading, and acknowledging notifications
- UI components integrated into app shell
- Cron job for checking lead inactivity (48+ hours)
- Integration with tasks and lead notes
- Admin comment notifications when admins comment on sales rep leads

## 📋 Pre-PR Checklist

### 1. Documentation Updates

#### ✅ Update USER_GUIDE.md
- [ ] Add a new section about notifications
- [ ] Document the notification bell icon in the header
- [ ] Explain the two notification types:
  - **LEAD_INACTIVITY**: Alerts when a lead has no activity for 48+ hours
  - **ADMIN_COMMENT**: Alerts when an admin comments on your lead
- [ ] Explain how to acknowledge notifications
- [ ] Document that ADMIN_COMMENT notifications disappear after acknowledgment
- [ ] Document that LEAD_INACTIVITY notifications stay until the lead becomes active again

#### ✅ Update README.md
- [ ] Add notifications to the Phase Status section
- [ ] Update the database schema documentation to include Notification and Task models
- [ ] Mention the cron job for inactivity checking

#### ✅ Create/Update Feature Documentation
- [ ] Consider adding a NOTIFICATIONS.md doc in `/docs` if needed for technical details
- [ ] Update FEATURE_BREAKDOWN.md if it exists

### 2. Database Migrations

#### ✅ Verify Migration Status
- [ ] Check if a migration exists for the Notification and Task models
- [ ] If not, create a migration:
  ```bash
  npm run db:migrate
  ```
- [ ] Verify the migration includes:
  - Notification model with all fields
  - Task model with all fields
  - Proper indexes
  - Foreign key constraints with cascade deletes
  - Enum types (NotificationType, TaskType, TaskStatus)

#### ✅ Test Migration
- [ ] Test migration on a clean database
- [ ] Verify rollback works if needed
- [ ] Check that indexes are created properly

### 3. Code Quality & Testing

#### ✅ Manual Testing Checklist
- [ ] **Notification Display**
  - [ ] Bell icon appears in header with badge count
  - [ ] Badge shows unacknowledged count
  - [ ] Dropdown opens and shows notifications
  - [ ] Notifications are grouped (unacknowledged vs acknowledged)
  - [ ] Icons display correctly for each notification type

- [ ] **LEAD_INACTIVITY Notifications**
  - [ ] Create a lead with old activity (48+ hours)
  - [ ] Run cron job or script manually
  - [ ] Verify notification is created
  - [ ] Verify task is created
  - [ ] Click notification → navigates to lead
  - [ ] Acknowledge notification → task is also acknowledged
  - [ ] Add activity to lead → verify notification still shows (until resolved)
  - [ ] Resolve task → verify notification behavior

- [ ] **ADMIN_COMMENT Notifications**
  - [ ] As admin, comment on a sales rep's lead
  - [ ] Verify notification is created for sales rep
  - [ ] Sales rep sees notification
  - [ ] Click notification → navigates to lead and auto-acknowledges
  - [ ] Acknowledge notification → it disappears from list
  - [ ] Verify note content shows in notification

- [ ] **Edge Cases**
  - [ ] Lead deleted → notifications cascade delete (test)
  - [ ] User deleted → notifications cascade delete (test)
  - [ ] Note deleted → notification noteId set to null (test)
  - [ ] Task deleted → notification taskId set to null (test)
  - [ ] Multiple notifications for same lead (should work)
  - [ ] Lead becomes active again → verify notification still shows until resolved
  - [ ] Unassigned lead → no notification created
  - [ ] WON/LOST lead → no notification created

- [ ] **API Endpoints**
  - [ ] GET /api/notifications - returns user's notifications
  - [ ] GET /api/notifications?unreadOnly=true - filters correctly
  - [ ] GET /api/notifications?unacknowledgedOnly=true - filters correctly
  - [ ] PATCH /api/notifications/[id]/read - marks as read
  - [ ] PATCH /api/notifications/[id]/acknowledge - acknowledges and updates task
  - [ ] PATCH /api/notifications/read-all - marks all as read
  - [ ] Verify unauthorized access is blocked
  - [ ] Verify users can only see their own notifications

- [ ] **Cron Job**
  - [ ] Test cron endpoint with correct secret
  - [ ] Test cron endpoint with wrong secret (should fail)
  - [ ] Test cron endpoint without secret (should fail)
  - [ ] Run script locally: `npm run cron:check-inactivity`
  - [ ] Verify no duplicate notifications created on multiple runs
  - [ ] Verify no duplicate tasks created

- [ ] **UI/UX**
  - [ ] Notifications dropdown closes when clicking outside
  - [ ] Polling works (updates every 30s when open, 60s when page visible)
  - [ ] Loading state shows while fetching
  - [ ] Error handling (network errors, etc.)
  - [ ] Mobile responsive
  - [ ] "Acknowledge All" button works

### 4. Error Handling & Edge Cases

#### ✅ Review Error Handling
- [ ] All API endpoints have try/catch blocks
- [ ] Error messages are user-friendly
- [ ] Console errors are appropriate (for debugging)
- [ ] Network errors in frontend are handled gracefully
- [ ] Verify no unhandled promise rejections

#### ✅ Edge Cases to Verify
- [ ] What happens if notification's lead is deleted? (Should cascade delete)
- [ ] What happens if notification's user is deleted? (Should cascade delete)
- [ ] What happens if notification's note is deleted? (Should set noteId to null)
- [ ] What happens if notification's task is deleted? (Should set taskId to null)
- [ ] What if a lead becomes active again? (Notification should stay until task resolved)
- [ ] What if a lead is reassigned? (Old notification stays, new one created if inactive)
- [ ] What if cron job runs while notification is being acknowledged? (Race condition check)

### 5. Performance Considerations

#### ✅ Performance Checks
- [ ] Database indexes are in place (userId, read, acknowledged, createdAt, leadId)
- [ ] API queries are efficient (no N+1 queries)
- [ ] Notification polling doesn't cause performance issues
- [ ] Large notification lists are paginated (limit/offset working)
- [ ] Consider adding database query optimization if needed

### 6. Security Review

#### ✅ Security Checklist
- [ ] All API endpoints require authentication
- [ ] Users can only access their own notifications
- [ ] Cron endpoint is protected by secret token
- [ ] No sensitive data exposed in API responses
- [ ] Input validation on all endpoints
- [ ] SQL injection protection (using Prisma, should be safe)

### 7. Code Review Items

#### ✅ Code Quality
- [ ] No console.log statements (console.error is fine for error logging)
- [ ] TypeScript types are correct
- [ ] No unused imports
- [ ] Code follows project conventions
- [ ] Comments are clear and helpful
- [ ] No hardcoded values that should be configurable

#### ✅ Linting
- [ ] Run `npm run lint` and fix any issues
- [ ] No TypeScript errors
- [ ] No ESLint warnings

### 8. Railway/Deployment Considerations

#### ✅ Deployment Checklist
- [ ] CRON_SECRET environment variable is documented
- [ ] Railway cron job is configured (see RAILWAY_CRON_SETUP.md)
- [ ] Database migrations will run on deploy
- [ ] Verify cron job schedule is correct (should run daily or as needed)
- [ ] Test cron job in production-like environment

### 9. Testing in Production-like Environment

#### ✅ Pre-Production Testing
- [ ] Test on staging/dev environment if available
- [ ] Verify database migrations work
- [ ] Test cron job execution
- [ ] Verify notifications work end-to-end
- [ ] Check performance with realistic data volumes

### 10. PR Preparation

#### ✅ Before Creating PR
- [ ] All checklist items above are completed
- [ ] Code is committed to feature branch
- [ ] Commit messages are clear and descriptive
- [ ] No merge conflicts with main
- [ ] PR description includes:
  - Summary of changes
  - What was implemented
  - How to test
  - Any breaking changes (if any)
  - Screenshots/GIFs if helpful

## 🚨 Known Issues / Future Improvements

Consider documenting these for future work (not blockers for PR):

- [ ] **Admin Notification Sharing**: Currently admins don't receive notifications about sales rep leads. If this is needed, see `NOTIFICATIONS_ADMIN_SHARING.md` for design options.
- [ ] Consider adding notification preferences (email, push, etc.)
- [ ] Consider adding notification history/archive
- [ ] Consider adding notification sound/desktop notifications
- [ ] Consider adding notification templates
- [ ] Consider adding notification batching (digest emails)
- [ ] Consider adding notification expiration/cleanup job
- [ ] Consider adding notification analytics

## 📝 PR Description Template

When creating the PR, use this template:

```markdown
## Notifications System Implementation

### Summary
Implements a comprehensive notifications system for the CRM, including:
- Real-time notification bell in header
- Lead inactivity alerts (48+ hours)
- Admin comment notifications
- Task integration
- Cron job for automated inactivity checking

### Changes
- Added Notification and Task models to Prisma schema
- Created API endpoints for notification management
- Integrated notification UI into app shell
- Added cron job for lead inactivity monitoring
- Added admin comment notification triggers

### Testing
- [x] Manual testing completed
- [x] Edge cases verified
- [x] Security review done
- [x] Performance checked

### Deployment Notes
- Requires CRON_SECRET environment variable
- Requires Railway cron job setup (see RAILWAY_CRON_SETUP.md)
- Database migration required

### Documentation
- Updated USER_GUIDE.md
- Updated README.md
```

## ✅ Final Checklist Before Merge

- [ ] All items in sections 1-9 are completed
- [ ] Code review completed (if applicable)
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] PR is approved
- [ ] Ready to merge to main

---

**Last Updated**: [Current Date]
**Status**: Pre-PR Review

