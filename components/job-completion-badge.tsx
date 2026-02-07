"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle } from "lucide-react";
import { JobStatus } from "@prisma/client";

interface JobCompletionBadgeProps {
  jobStatus: JobStatus | null;
  hasProfitLossFile?: boolean;
  showStatusOnly?: boolean; // If true, only shows job status badge without completion state
  className?: string;
}

/**
 * Composite badge component for displaying job completion status.
 * Shows "Fully Complete" when job is DONE and has P&L file uploaded.
 * Shows "Needs Financials" when job is DONE but missing P&L file.
 * Otherwise shows the current job status.
 */
export function JobCompletionBadge({
  jobStatus,
  hasProfitLossFile = false,
  showStatusOnly = false,
  className = "",
}: JobCompletionBadgeProps) {
  // No job status set
  if (!jobStatus) {
    return (
      <Badge
        variant="outline"
        className={`bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 ${className}`}
      >
        Not Set
      </Badge>
    );
  }

  // Job is DONE - show completion status
  if (jobStatus === "DONE" && !showStatusOnly) {
    if (hasProfitLossFile) {
      // Fully complete - job done AND financials uploaded
      return (
        <Badge
          className={`bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 ${className}`}
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Fully Complete
        </Badge>
      );
    } else {
      // Job done but needs financials
      return (
        <Badge
          className={`bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 ${className}`}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Needs Financials
        </Badge>
      );
    }
  }

  // In Progress
  if (jobStatus === "IN_PROGRESS") {
    return (
      <Badge
        variant="secondary"
        className={`bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 ${className}`}
      >
        In Progress
      </Badge>
    );
  }

  // Scheduled
  if (jobStatus === "SCHEDULED") {
    return (
      <Badge
        variant="secondary"
        className={`bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-300 dark:border-blue-700 ${className}`}
      >
        Scheduled
      </Badge>
    );
  }

  // Fallback for DONE when showStatusOnly is true
  return (
    <Badge
      className={`bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-300 dark:border-green-700 ${className}`}
    >
      Done
    </Badge>
  );
}
