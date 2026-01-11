# Dynamic Inactivity Detection Plan

## Overview
Replace the cron job-based inactivity system with dynamic, real-time inactivity calculation when users view leads. This provides immediate, always-up-to-date information without requiring scheduled jobs.

## Goals
1. **Admins**: See which leads are inactive (48+ hours) when viewing the leads list
2. **Sales Reps**: See which of their own leads need follow-up (48+ hours) when viewing their leads
3. **Real-time**: Always show current status without waiting for cron jobs
4. **Performance**: Efficient calculation that doesn't slow down lead fetching

---

## Phase 1: Backend API Changes

### 1.1 Modify `/api/leads` GET endpoint
**File**: `app/api/leads/route.ts`

**Changes**:
- Add inactivity calculation for each lead when fetched
- Only calculate for leads that are:
  - Assigned to a sales rep (not unassigned)
  - Not in terminal states (WON, LOST)
- Add new fields to lead response:
  ```typescript
  {
    isInactive: boolean,           // true if > 48 hours since last activity
    hoursSinceActivity: number | null,  // hours since last activity (null if no activity)
    lastActivityTimestamp: string | null,  // ISO timestamp of last activity
    needsFollowUp: boolean        // alias for isInactive (for clarity)
  }
  ```

**Performance Optimization**:
- Batch calculate activity for all leads in a single query where possible
- Use `Promise.all()` to calculate activity in parallel
- Consider caching if performance becomes an issue (future optimization)

**Implementation Details**:
- Use existing `getLastActivityTimestamp()` function from `lib/lead-activity.ts`
- Calculate only when:
  - User is ADMIN (for all leads)
  - User is SALES_REP/CONCIERGE viewing their own leads (`myLeads=true`)
- Skip calculation for:
  - Unassigned leads
  - Leads in WON/LOST status
  - Sales reps viewing all leads (read-only view)

### 1.2 Optional: Add query parameter for inactivity filter
**Enhancement**: Add `?inactive=true` query parameter to filter only inactive leads
- Useful for admins to quickly see which leads need attention
- Could add to frontend as a filter option

---

## Phase 2: Frontend Changes

### 2.1 Update Leads List Page (`app/(protected)/leads/page.tsx`)

**For Admins**:
- Add new column: "Last Activity" showing:
  - Time since last activity (e.g., "2 days ago", "3 hours ago")
  - Badge/indicator for inactive leads (48+ hours)
- Add visual indicator:
  - Red/orange badge on inactive leads
  - Tooltip showing exact hours/days since activity
- Add filter option:
  - "Show only inactive leads" checkbox or toggle
  - Filter by inactivity status
- Add sorting:
  - Sort by "Last Activity" (most inactive first)
  - Default sort could prioritize inactive leads

**For Sales Reps (viewing their own leads)**:
- Same visual indicators as admins
- Badge showing "Needs Follow-Up" for inactive leads
- Highlight inactive leads in the table (subtle background color)
- Show count of inactive leads in header (e.g., "My Leads (3 need follow-up)")

**UI Components**:
- Badge component for inactive status
- Tooltip showing detailed inactivity information
- Filter toggle/checkbox
- Optional: Alert banner at top showing count of inactive leads

### 2.2 Update Lead Type Definition
**File**: `app/(protected)/leads/page.tsx`

Add to `Lead` type:
```typescript
type Lead = {
  // ... existing fields
  isInactive?: boolean
  hoursSinceActivity?: number | null
  lastActivityTimestamp?: string | null
  needsFollowUp?: boolean
}
```

### 2.3 Column Definitions
Add new column to AG Grid:
```typescript
{
  field: "lastActivityTimestamp",
  headerName: "Last Activity",
  valueGetter: (params) => {
    if (!params.data.lastActivityTimestamp) return "Never"
    const hours = params.data.hoursSinceActivity
    if (hours === null) return "Never"
    if (hours < 24) return `${Math.floor(hours)}h ago`
    if (hours < 48) return `${Math.floor(hours / 24)}d ago`
    return `${Math.floor(hours / 24)}d ago`
  },
  cellRenderer: (params: any) => {
    const isInactive = params.data.isInactive
    return (
      <div className="flex items-center gap-2">
        <span>{params.value}</span>
        {isInactive && (
          <Badge variant="destructive" className="text-xs">
            Needs Follow-Up
          </Badge>
        )}
      </div>
    )
  },
  flex: 1,
  minWidth: 150,
}
```

---

## Phase 3: Performance Considerations

### 3.1 Optimization Strategies

**Option A: Batch Calculation (Recommended)**
- Calculate activity for all leads in parallel using `Promise.all()`
- Use existing `getLastActivityTimestamp()` function
- Acceptable for < 100 leads per page
- Simple to implement

**Option B: Database-Level Calculation (Future)**
- If performance becomes an issue, move calculation to database
- Use SQL to calculate last activity in a single query
- More complex but faster for large datasets

**Option C: Caching (Future)**
- Cache inactivity status for a short period (e.g., 5-10 minutes)
- Invalidate cache when lead is updated
- Reduces redundant calculations

### 3.2 Performance Testing
- Test with 100+ leads
- Measure API response time
- Optimize if response time > 1 second

---

## Phase 4: Cron Job Decision

### 4.1 Options for Existing Cron Job

**Option A: Remove Cron Job Entirely (Recommended)**
- Remove `/api/cron/check-inactivity` endpoint
- Remove `scripts/check-inactivity.ts`
- Remove LEAD_INACTIVITY tasks and notifications
- Simplify system - no scheduled jobs needed

**Option B: Keep for Historical/Backup**
- Keep cron job but run less frequently (weekly?)
- Use as backup/audit trail
- Still create tasks for record-keeping

**Option C: Hybrid Approach**
- Remove notifications (replaced by dynamic calculation)
- Keep tasks for tracking/acknowledgment
- Admins can still see tasks in Tasks page
- Sales reps get dynamic indicators instead of notifications

### 4.2 Recommendation: Option A
- Simplest solution
- No maintenance overhead
- Real-time is better than scheduled
- Can always add back if needed

---

## Phase 5: Migration Plan

### 5.1 Cleanup Tasks
1. Remove cron job endpoint (`app/api/cron/check-inactivity/route.ts`)
2. Remove cron job script (`scripts/check-inactivity.ts`)
3. Remove cron job from Railway/deployment config
4. Update documentation to remove cron job references
5. Optional: Archive existing LEAD_INACTIVITY tasks (or delete them)

### 5.2 Database Considerations
- No schema changes needed
- Existing `Task` and `Notification` tables remain (for other uses)
- Can optionally clean up old LEAD_INACTIVITY records

### 5.3 Documentation Updates
- Update `RAILWAY_CRON_SETUP.md` (mark as deprecated or remove)
- Update `NOTIFICATIONS_PR_CHECKLIST.md`
- Update `USER_GUIDE.md` with new inactivity indicators
- Add note about dynamic calculation in relevant docs

---

## Phase 6: Sales Rep Notifications (Future Enhancement)

### 6.1 In-App Indicators (Current Plan)
- Visual badges/indicators in leads list
- Count of inactive leads in header
- Highlighting of rows needing attention

### 6.2 Optional: Browser Notifications
- Could add browser push notifications when leads become inactive
- Would require Web Push API setup
- More complex but provides real-time alerts

### 6.3 Optional: Email Notifications
- Daily/weekly digest of inactive leads
- Simpler than push notifications
- Less intrusive

---

## Implementation Order

1. **Phase 1**: Backend API changes (add inactivity fields)
2. **Phase 2**: Frontend changes (display inactivity indicators)
3. **Phase 3**: Performance testing and optimization
4. **Phase 4**: Decision on cron job (recommend removal)
5. **Phase 5**: Cleanup and documentation
6. **Phase 6**: Future enhancements (if needed)

---

## Success Criteria

✅ Admins can see inactive leads immediately when viewing leads list
✅ Sales reps can see which of their leads need follow-up
✅ No dependency on cron jobs for inactivity detection
✅ Performance is acceptable (< 1 second for 100 leads)
✅ UI clearly indicates which leads need attention
✅ System is simpler and easier to maintain

---

## Open Questions

1. **Should we keep tasks for inactivity?**
   - Pro: Historical tracking, acknowledgment workflow
   - Con: Adds complexity, may not be needed with dynamic indicators
   - **Recommendation**: Remove tasks, use dynamic indicators only

2. **Should we keep notifications for inactivity?**
   - Pro: Alerts users proactively
   - Con: Can be noisy, dynamic indicators are better
   - **Recommendation**: Remove notifications, use dynamic indicators

3. **What about unassigned leads?**
   - Currently: Cron job doesn't check unassigned leads
   - With dynamic: Could show inactivity for unassigned leads too
   - **Recommendation**: Show inactivity for unassigned leads (helps admins prioritize)

4. **Performance threshold?**
   - What's acceptable response time?
   - When should we optimize?
   - **Recommendation**: Optimize if > 1 second for 100 leads

---

## Notes

- This approach is simpler and more maintainable than cron jobs
- Real-time data is always better than scheduled updates
- Can be extended later with caching if needed
- No database migrations required
- Backward compatible (adds new fields, doesn't break existing functionality)
