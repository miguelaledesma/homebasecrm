# Auto-Delete Acknowledged Notifications

## Decision

**Acknowledged notifications are now automatically deleted from the database.**

This keeps the database clean and simplifies queries, since acknowledged notifications serve no further purpose.

## Implementation

### When Notifications Are Deleted

1. **When a notification is acknowledged directly** (`PATCH /api/notifications/[id]/acknowledge`)
   - Notification is deleted immediately after acknowledgment
   - If linked to a task, the task is acknowledged first, then notification is deleted

2. **When a task is acknowledged** (`PATCH /api/tasks/[id]/acknowledge`)
   - If the task has a linked notification, the notification is deleted

3. **When a task is resolved** (`PATCH /api/tasks/[id]/resolve`)
   - If the task has a linked notification, the notification is deleted
   - This handles cases where a task is resolved without being acknowledged first

### What Happens to Tasks?

- **Tasks are NOT deleted** - they continue to track state (PENDING → ACKNOWLEDGED → RESOLVED)
- Tasks are the source of truth for tracking inactivity issues
- Notifications are just alerts - once acknowledged, the task handles the rest

### What Happens to Data?

- **No data loss** - Tasks still exist and track everything important
- **No audit trail** - We lose notification history (acceptable for MVP)
- **Simpler queries** - No need to filter out acknowledged notifications

## Code Changes

### API Endpoints Updated

1. `app/api/notifications/[id]/acknowledge/route.ts`
   - Now deletes notification instead of updating it
   - Acknowledges linked task first (if exists)

2. `app/api/tasks/[id]/acknowledge/route.ts`
   - Deletes linked notification when task is acknowledged

3. `app/api/tasks/[id]/resolve/route.ts`
   - Deletes linked notification when task is resolved

4. `app/api/notifications/route.ts`
   - Removed filtering logic (acknowledged notifications don't exist)
   - Simplified query and response

### UI Components Updated

1. `components/notifications-list.tsx`
   - Removed "acknowledged" section (always empty)
   - Simplified rendering (all notifications are unacknowledged)
   - Removed conditional acknowledge button (always show)

## Benefits

✅ **Cleaner database** - No accumulation of old notifications  
✅ **Simpler queries** - No need to filter acknowledged notifications  
✅ **Better performance** - Fewer records to query  
✅ **Clear semantics** - If it exists, it needs attention  

## Trade-offs

⚠️ **No notification history** - Can't see what notifications were sent in the past  
⚠️ **No analytics** - Can't track notification patterns over time  
⚠️ **Debugging** - Must rely on application logs if issues occur  

**For MVP, these trade-offs are acceptable.** Tasks provide the important tracking data.

## Testing Checklist

- [ ] Acknowledge ADMIN_COMMENT notification → should be deleted
- [ ] Acknowledge LEAD_INACTIVITY notification → should be deleted, task acknowledged
- [ ] Acknowledge task directly → notification should be deleted
- [ ] Resolve task → notification should be deleted (if exists)
- [ ] Verify notifications list only shows unacknowledged notifications
- [ ] Verify no errors when acknowledging notifications
- [ ] Verify tasks still exist and track state correctly

## Migration Notes

**No database migration needed** - This is a code change only.

Existing acknowledged notifications in the database will:
- Still be filtered out by the UI (they won't appear)
- Can be cleaned up manually if desired:
  ```sql
  DELETE FROM notifications WHERE acknowledged = true;
  ```

Or leave them - they won't affect functionality since the code now deletes on acknowledge.

