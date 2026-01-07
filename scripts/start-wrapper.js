#!/usr/bin/env node

/**
 * Start wrapper that routes to either Next.js server or cron job
 * based on RUN_CRON_JOB environment variable
 */

if (process.env.RUN_CRON_JOB === "true") {
  // Run the cron job script
  require("tsx/cjs/register");
  require("./check-inactivity.ts");
} else {
  // Start Next.js server (default behavior)
  require("next/dist/bin/next").start();
}

