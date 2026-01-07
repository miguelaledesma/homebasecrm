# Admin Notification Sharing - Design Decision

## Current Implementation

**Status**: ✅ Notifications are **user-specific** (each user only sees their own)

- Each notification has a `userId` field indicating who receives it
- API filters by `session.user.id` - users only see their own notifications
- When a lead becomes inactive, notification is created **only for the assigned sales rep**
- When an admin comments, notification is created **only for the sales rep** (not for other admins)

## The Problem Scenario

**Question**: What if admins need to see all sales rep notifications?

**Issue**: If multiple admins share the same notification:
- ❌ If Admin A acknowledges a notification → it disappears for Admin B (bad!)
- ❌ If Admin A marks it as read → it's marked as read for Admin B (bad!)
- ❌ One admin's actions affect all admins' views

## Solution Options

### Option 1: Duplicate Notifications Per Admin (Recommended)

Create a separate notification for each admin when a sales rep lead becomes inactive.

**Pros:**
- ✅ Each admin has independent notification state
- ✅ One admin's actions don't affect others
- ✅ Simple to implement
- ✅ Maintains current architecture

**Cons:**
- ⚠️ More database records (one per admin per inactive lead)
- ⚠️ If you have 5 admins and 10 inactive leads = 50 notifications

**Implementation:**
```typescript
// In cron job, after creating notification for sales rep:
if (!existingNotification && !existingTask) {
  // Create task first
  const task = await prisma.task.create({...})

  // Create notification for sales rep
  await prisma.notification.create({
    data: {
      userId: lead.assignedSalesRepId,
      leadId: lead.id,
      type: "LEAD_INACTIVITY",
      taskId: task.id,
    },
  })

  // Create notifications for all admins
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  })

  for (const admin of admins) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        leadId: lead.id,
        type: "LEAD_INACTIVITY",
        taskId: task.id, // Same task, different notification
      },
    })
  }
}
```

### Option 2: Admin-Only View (Read-Only Dashboard)

Create a separate admin dashboard that shows all notifications without allowing acknowledge/read actions.

**Pros:**
- ✅ No duplicate notifications
- ✅ Single source of truth
- ✅ Admins can't accidentally clear notifications for others

**Cons:**
- ⚠️ Requires separate UI/API endpoint
- ⚠️ More complex implementation
- ⚠️ Admins can't track what they've "seen" (no read state)

**Implementation:**
```typescript
// New endpoint: GET /api/admin/notifications
// Returns all notifications (read-only view)
// No acknowledge/read endpoints for admins
```

### Option 3: Shared Notification with Per-User Read State

Add a separate `NotificationRead` junction table to track read state per user.

**Pros:**
- ✅ Single notification record
- ✅ Per-user read state
- ✅ Most efficient storage

**Cons:**
- ⚠️ Requires schema changes
- ⚠️ More complex queries
- ⚠️ Breaking change to current architecture

**Schema Change:**
```prisma
model Notification {
  id String @id @default(cuid())
  // ... existing fields
  // Remove userId, read, readAt, acknowledged, acknowledgedAt
  
  reads NotificationRead[] // New relation
}

model NotificationRead {
  id String @id @default(cuid())
  notificationId String
  userId String
  read Boolean @default(false)
  readAt DateTime?
  acknowledged Boolean @default(false)
  acknowledgedAt DateTime?
  
  notification Notification @relation(...)
  user User @relation(...)
  
  @@unique([notificationId, userId])
}
```

## Recommendation

**For MVP/Current Phase**: Keep current implementation (Option 0 - no admin sharing)

**If admins need visibility**: Use **Option 1 (Duplicate Notifications)** because:
1. Easiest to implement
2. No breaking changes
3. Maintains current architecture
4. Independent state per admin
5. Database storage is cheap

**If scale becomes an issue** (many admins, many notifications): Consider Option 3

## Implementation Checklist (if adding admin notifications)

If you decide to implement admin notifications:

- [ ] Update cron job to create notifications for all admins
- [ ] Update admin comment notification creation to notify all admins
- [ ] Test that each admin sees their own notification state
- [ ] Test that one admin's acknowledge doesn't affect others
- [ ] Update documentation
- [ ] Consider notification preferences (some admins might not want all notifications)

## Current Behavior (No Changes Needed)

The current implementation is **correct** for the MVP:
- Sales reps get notifications about their leads
- Admins can see all leads in the admin dashboard
- Admins can see inactive leads in the Admin Follow-ups page
- No notification conflicts between users

**Recommendation**: Keep as-is unless there's a specific business requirement for admins to receive notifications.

