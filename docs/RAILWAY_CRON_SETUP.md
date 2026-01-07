# Railway Cron Job Setup

This guide explains how to set up the 48-hour inactivity check as a Railway cron job.

## Overview

The inactivity check runs on a schedule to identify leads that haven't had any activity for 48+ hours and creates notifications and tasks for the assigned sales reps.

**How Railway Cron Jobs Work:**

- Railway executes the service's **start command** on the given schedule
- The service should complete its task and **exit immediately** (don't keep it running)
- The service must close all connections (database, etc.) before exiting
- If a previous execution is still running when the next one is due, Railway will skip the new execution
- Schedules are based on **UTC time**
- Minimum interval between executions is **5 minutes**

## Setup Instructions

### 1. Create a New Service in Railway

1. In your Railway project, click **"+ New"** → **"Empty Service"**
2. Name it something like `inactivity-checker` or `cron-inactivity`

### 2. Connect to Your Repository

1. Connect the service to the same GitHub repository as your main app
2. Use the same branch (usually `main` or your production branch)
3. Railway will auto-detect it's a Node.js project

### 3. Configure the Service

1. Go to the service **Settings** tab
2. Set the **Start Command** to:
   ```
   npm run cron:check-inactivity
   ```
   This will run the script that calls your API endpoint
3. In the **Cron Schedule** field (under "Cron" section), enter:
   ```
   0 1 * * *
   ```
   This runs daily at 1:00 AM UTC

**Note**: Railway cron jobs are based on UTC time. The minimum interval is 5 minutes.

### 4. Set Environment Variables

Make sure the service has access to the same environment variables as your main app:

- `DATABASE_URL` - Required for database access (can be shared from main app)

**Option 1: Shared Variables (Recommended)**

- Railway can share variables across services in the same project
- Go to your main app service → Variables → Enable sharing for `DATABASE_URL`

**Option 2: Manual Setup**

- Go to the cron service → Variables tab
- Add `DATABASE_URL` variable
- Copy the value from your main app service

**Note**: The script (`scripts/check-inactivity.ts`) directly accesses the database using Prisma, so it only needs `DATABASE_URL`. It doesn't need to call an HTTP endpoint.

### 5. Deploy

1. Railway will automatically deploy when you save the settings
2. Check the service logs to verify it's running correctly
3. The first run will happen at the next scheduled time
4. **Important**: The service should exit after completing the task (don't keep it running)

## Alternative Schedules

**Daily at 1 AM UTC (Recommended):**

```
0 1 * * *
```

Runs once per day at 1:00 AM UTC

**Every 6 hours:**

```
0 */6 * * *
```

Runs at: 00:00, 06:00, 12:00, 18:00 UTC

**Every 4 hours:**

```
0 */4 * * *
```

Runs at: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC

**Every 12 hours:**

```
0 */12 * * *
```

Runs at: 00:00, 12:00 UTC

**Note**: Railway's minimum interval is 5 minutes. For 48-hour inactivity checks, running daily is sufficient since we're checking for leads inactive for 48+ hours.

## Manual Testing

You can test the script locally by running:

```bash
npm run cron:check-inactivity
```

Or directly with tsx:

```bash
tsx scripts/check-inactivity.ts
```

## Monitoring

- Check the **cron service logs** in Railway to see execution results
- The script/API logs:
  - Number of leads processed
  - Number of notifications created
  - Number of tasks created
  - Any errors encountered
- Railway will show when each cron execution starts and completes
- **Important**: If a previous execution is still running when the next one is due, Railway will skip the new execution

## Troubleshooting

### Script exits with error

- Check that `DATABASE_URL` is set correctly
- Verify database connection is accessible
- Check logs for specific error messages

### No notifications being created

- Verify leads exist with `assignedSalesRepId` set
- Check that leads have been inactive for more than 48 hours
- Ensure leads are not in WON or LOST status
- Check that notifications/tasks don't already exist (duplicate prevention)

### Script doesn't run on schedule

- Verify the cron expression is correct (5 fields: `minute hour day month weekday`)
- Check Railway service settings (Cron Schedule field in Settings)
- Ensure the service is deployed and active
- Railway cron jobs are based on **UTC time** (not your local timezone)
- Check if previous execution is still running (Railway skips if previous run hasn't finished)
- Verify the service exits properly after completing the task
- Check service logs for any startup errors

### Service doesn't exit properly

- The service **must exit** after completing the task
- Close all database connections (`await prisma.$disconnect()`)
- Don't keep the process running
- The script already includes `process.exit(0)` at the end
- If the script hangs, check for open connections or pending promises

## Cron Expression Examples

**Format**: `minute hour day month weekday`

- **Daily at 1 AM UTC** (recommended): `0 1 * * *`
- Every 6 hours: `0 */6 * * *` (runs at 00:00, 06:00, 12:00, 18:00 UTC)
- Every 4 hours: `0 */4 * * *` (runs at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)
- Every 12 hours: `0 */12 * * *` (runs at 00:00, 12:00 UTC)
- Every day at 2 AM UTC: `0 2 * * *`
- Every weekday at 9 AM UTC: `0 9 * * 1-5` (Monday-Friday)
- Every 15 minutes: `*/15 * * * *` (minimum is 5 minutes, so this works)
- Every 2 hours: `0 */2 * * *`

**Important**: All times are in UTC. Railway does not guarantee execution times to the exact minute (can vary by a few minutes).
