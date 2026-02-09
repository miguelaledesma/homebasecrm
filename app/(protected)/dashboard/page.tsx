"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Calendar,
  TrendingUp,
  Target,
  CheckCircle,
  Clock,
  Award,
  Bell,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  UserPlus,
  DollarSign,
  Plus,
  Activity,
  Zap,
  ChevronRight,
  Eye,
} from "lucide-react";
import { SalesRepTeamPerformance } from "@/components/sales-rep-team-performance";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalLeads: number;
  appointmentSetLeads: number;
  newLeads: number;
  assignedLeads: number;
  quotedLeads: number;
  wonLeads: number;
  totalAppointments: number;
  scheduledAppointments: number;
  pastDueAppointments?: number;
  unassignedLeads?: number;
  overdueFollowUps?: number;
  jobsPendingFinancials?: number;
  leadToAppointmentRate: number;
  winRate: number;
  leadsWithAppointments?: number;
  avgDaysToClose?: number | null;
}

type TeamMemberStat = {
  userId: string;
  userName: string | null;
  userEmail: string;
  totalLeads: number;
  wonLeads: number;
  winRate: number;
  appointmentSetLeads: number;
  conversionRate: number;
  totalAppointments: number;
  overdueFollowUps: number;
};

type TeamSortKey = "overdueFollowUps" | "totalLeads" | "wonLeads";

type Notification = {
  id: string;
  type:
    | "LEAD_INACTIVITY"
    | "ADMIN_COMMENT"
    | "CONCIERGE_LEAD"
    | "CALENDAR_TASK";
  read: boolean;
  acknowledged: boolean;
  createdAt: string;
  lead: {
    id: string;
    customer: {
      firstName: string;
      lastName: string;
    };
    createdByUser: {
      name: string | null;
      email: string;
      role: string;
    } | null;
  } | null;
  note: {
    id: string;
    content: string;
    createdByUser: {
      name: string | null;
      email: string;
    };
  } | null;
};

// ─── Color Map for Urgency Cards ───────────────────────────────────────────────

const urgencyColorMap: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  orange: {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-700 dark:text-orange-300",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-300",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Shared state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Sales Rep state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Admin Command Center state
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [teamStats, setTeamStats] = useState<TeamMemberStat[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamSortKey, setTeamSortKey] = useState<TeamSortKey>(
    "overdueFollowUps"
  );

  // ── Derived role checks ──────────────────────────────────────────────────────
  const isAdmin = session?.user?.role === "ADMIN";
  const isConcierge = session?.user?.role === "CONCIERGE";
  const isAdminView = isAdmin && !isConcierge;

  // ── Data fetching ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (!response.ok) throw new Error("Failed to fetch stats");
        const data = await response.json();
        setStats(data.stats);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard stats");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Mobile notifications (Sales Rep)
  useEffect(() => {
    async function fetchNotifications() {
      if (!session?.user || isAdminView) return;
      try {
        setLoadingNotifications(true);
        const response = await fetch("/api/notifications?limit=5");
        if (!response.ok) throw new Error("Failed to fetch notifications");
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnacknowledgedCount(data.counts?.unacknowledged || 0);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        setLoadingNotifications(false);
      }
    }
    fetchNotifications();
  }, [session?.user, isAdminView]);

  // Calendar tasks (Admin)
  useEffect(() => {
    async function fetchAssignedTasks() {
      if (!session?.user || !isAdminView) return;
      try {
        setLoadingTasks(true);
        const response = await fetch(
          "/api/calendar/assigned-tasks?upcomingOnly=true&limit=5"
        );
        if (!response.ok) throw new Error("Failed to fetch assigned tasks");
        const data = await response.json();
        setAssignedTasks(data.tasks || []);
      } catch (error) {
        console.error("Error fetching assigned tasks:", error);
      } finally {
        setLoadingTasks(false);
      }
    }
    fetchAssignedTasks();
  }, [session?.user, isAdminView]);

  // Team performance (Admin)
  useEffect(() => {
    async function fetchTeamStats() {
      if (!session?.user || !isAdminView) return;
      try {
        setLoadingTeam(true);
        const response = await fetch("/api/analytics/team-performance");
        if (!response.ok) throw new Error("Failed to fetch team stats");
        const data = await response.json();
        setTeamStats(data.stats || []);
      } catch (error) {
        console.error("Error fetching team stats:", error);
      } finally {
        setLoadingTeam(false);
      }
    }
    fetchTeamStats();
  }, [session?.user, isAdminView]);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const pastDueAppointmentsCount = stats?.pastDueAppointments || 0;

  const sortedTeamStats = useMemo(() => {
    return [...teamStats].sort((a, b) => {
      if (teamSortKey === "overdueFollowUps")
        return b.overdueFollowUps - a.overdueFollowUps;
      if (teamSortKey === "totalLeads") return b.totalLeads - a.totalLeads;
      return b.wonLeads - a.wonLeads;
    });
  }, [teamStats, teamSortKey]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LEAD_INACTIVITY":
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case "ADMIN_COMMENT":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "CONCIERGE_LEAD":
        return <UserPlus className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationMessage = (notification: Notification) => {
    if (notification.type === "LEAD_INACTIVITY") {
      const customerName = notification.lead
        ? `${notification.lead.customer.firstName} ${notification.lead.customer.lastName}`
        : "a lead";
      return `No activity on ${customerName} for 48+ hours`;
    } else if (notification.type === "ADMIN_COMMENT") {
      const adminName =
        notification.note?.createdByUser?.name ||
        notification.note?.createdByUser?.email ||
        "Deleted User";
      return `${adminName} commented on your lead`;
    } else if (notification.type === "CONCIERGE_LEAD") {
      const customerName = notification.lead
        ? `${notification.lead.customer.firstName} ${notification.lead.customer.lastName}`
        : "a new lead";
      const conciergeName =
        notification.lead?.createdByUser?.name ||
        notification.lead?.createdByUser?.email ||
        "Concierge";
      return `New lead from ${conciergeName}: ${customerName}`;
    }
    return "New notification";
  };

  // ── Loading / Error ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
          </h1>
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADMIN COMMAND CENTER
  // ═══════════════════════════════════════════════════════════════════════════════

  if (isAdminView) {
    // Urgency items for Today's Focus
    const urgencyItems = [
      {
        key: "overdue",
        count: stats.overdueFollowUps || 0,
        label: "Overdue Follow-ups",
        sublabel: "48+ hours inactive",
        icon: AlertTriangle,
        color: "orange",
        route: "/leads?showOverdue=true",
        cta: "Review",
      },
      {
        key: "unassigned",
        count: stats.unassignedLeads || 0,
        label: "Unassigned Leads",
        sublabel: "Need rep assignment",
        icon: UserPlus,
        color: "blue",
        route: "/leads?view=unassigned",
        cta: "Assign",
      },
      {
        key: "financials",
        count: stats.jobsPendingFinancials || 0,
        label: "Financials Pending",
        sublabel: "Jobs need P&L",
        icon: DollarSign,
        color: "amber",
        route: "/quotes?status=ACCEPTED",
        cta: "Add P&L",
      },
      {
        key: "pastdue",
        count: pastDueAppointmentsCount,
        label: "Past Due Appts",
        sublabel: "Need status update",
        icon: Calendar,
        color: "red",
        route: "/appointments?pastDue=true",
        cta: "Update",
      },
    ];

    const activeUrgencyItems = urgencyItems.filter((item) => item.count > 0);
    const totalUrgent = activeUrgencyItems.reduce(
      (acc, item) => acc + item.count,
      0
    );

    // Next Best Actions
    const nextActions = [
      stats.overdueFollowUps && stats.overdueFollowUps > 0
        ? {
            text: `Follow up on ${stats.overdueFollowUps} overdue lead${stats.overdueFollowUps !== 1 ? "s" : ""}`,
            icon: AlertTriangle,
            color: "text-orange-600 dark:text-orange-400",
            route: "/leads?showOverdue=true",
          }
        : null,
      stats.unassignedLeads && stats.unassignedLeads > 0
        ? {
            text: `Assign ${stats.unassignedLeads} unassigned lead${stats.unassignedLeads !== 1 ? "s" : ""}`,
            icon: UserPlus,
            color: "text-blue-600 dark:text-blue-400",
            route: "/leads?view=unassigned",
          }
        : null,
      stats.jobsPendingFinancials && stats.jobsPendingFinancials > 0
        ? {
            text: `Add financials for ${stats.jobsPendingFinancials} completed job${stats.jobsPendingFinancials !== 1 ? "s" : ""}`,
            icon: DollarSign,
            color: "text-amber-600 dark:text-amber-400",
            route: "/quotes?status=ACCEPTED",
          }
        : null,
      pastDueAppointmentsCount > 0
        ? {
            text: `Update ${pastDueAppointmentsCount} past due appointment${pastDueAppointmentsCount !== 1 ? "s" : ""}`,
            icon: Calendar,
            color: "text-red-600 dark:text-red-400",
            route: "/appointments?pastDue=true",
          }
        : null,
      assignedTasks.length > 0
        ? {
            text: `Complete ${assignedTasks.length} calendar task${assignedTasks.length !== 1 ? "s" : ""}`,
            icon: CheckCircle,
            color: "text-purple-600 dark:text-purple-400",
            route: "/calendar",
          }
        : null,
    ].filter(Boolean) as {
      text: string;
      icon: any;
      color: string;
      route: string;
    }[];

    return (
      <div className="space-y-8">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome, {session?.user?.name || "there"}
            </h1>
            <p className="text-muted-foreground mt-1">
              Command center for leads and appointments
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => router.push("/leads/new")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              New lead
            </Button>
          </div>
        </div>

        {/* ── Top Section: Today's Focus + Metric Cards ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Focus Card */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center flex-shrink-0">
                      <Zap className="h-5 w-5 text-white dark:text-gray-900" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Today&apos;s Focus
                      </CardTitle>
                      <CardDescription>
                        Triage what matters first
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {urgencyItems.slice(0, 3).map((item) => {
                    const Icon = item.icon;
                    const isOk = item.count === 0;
                    const c = urgencyColorMap[item.color];
                    const badgeLabel = isOk
                      ? "None waiting"
                      : item.key === "overdue"
                        ? "Needs attention"
                        : item.key === "financials"
                          ? "Needs expense tracking"
                          : item.sublabel;
                    const badgeColor = isOk
                      ? "bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20"
                      : item.color === "orange"
                        ? "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20"
                        : item.color === "amber"
                          ? "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20"
                          : "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20";

                    return (
                      <div
                        key={item.key}
                        className="rounded-xl border bg-card p-5 flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-sm font-medium text-muted-foreground">
                            {item.label}
                          </span>
                          {isOk ? (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <Icon
                              className={`h-5 w-5 ${c.text} flex-shrink-0`}
                            />
                          )}
                        </div>
                        <div className="text-3xl font-bold tracking-tight mb-3">
                          {item.count}
                        </div>
                        <span
                          className={`inline-flex items-center self-start rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${badgeColor} mb-4`}
                        >
                          {badgeLabel}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-auto"
                          onClick={() => router.push(item.route)}
                        >
                          Review
                        </Button>
                      </div>
                    );
                  })}
                </div>
                {/* Past Due Appointments Banner */}
                {pastDueAppointmentsCount > 0 && (
                  <div
                    className="mt-4 flex items-center justify-between rounded-xl border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 px-4 py-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    onClick={() =>
                      router.push("/appointments?pastDue=true")
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-sm font-medium text-red-700 dark:text-red-300">
                        {pastDueAppointmentsCount} past due appointment
                        {pastDueAppointmentsCount !== 1 ? "s" : ""} need
                        status updates
                      </span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-red-400" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Metric Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Total Leads */}
            <Card className="border-l-4 border-l-indigo-500 shadow-sm rounded-2xl flex-1">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total leads
                  </span>
                  <Zap className="h-5 w-5 text-indigo-500 flex-shrink-0" />
                </div>
                <div className="text-4xl font-bold tracking-tight mb-1">
                  {stats.totalLeads}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  All leads in the system
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start mt-auto"
                  onClick={() => router.push("/leads?view=all")}
                >
                  View leads
                </Button>
              </CardContent>
            </Card>

            {/* Won Leads */}
            <Card className="border-l-4 border-l-green-500 shadow-sm rounded-2xl flex-1">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Won leads
                  </span>
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                </div>
                <div className="text-4xl font-bold tracking-tight mb-1">
                  {stats.wonLeads}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {stats.winRate}% win rate
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start mt-auto"
                  onClick={() => router.push("/won-lost")}
                >
                  View wins
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Lower Grid ──────────────────────────────────────────────────────── */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
          {/* Left Column: Pipeline + Status + Tasks + Actions */}
          <div className="lg:col-span-3 space-y-6">
            {/* Pipeline Health Snapshot */}
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base font-semibold">
                    Pipeline Health
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div
                    className="cursor-pointer hover:bg-accent/50 rounded-lg p-3 -m-1 transition-colors"
                    onClick={() => router.push("/leads?view=all")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Total Leads
                      </span>
                    </div>
                    <div className="text-2xl font-bold">{stats.totalLeads}</div>
                  </div>

                  <div
                    className="cursor-pointer hover:bg-accent/50 rounded-lg p-3 -m-1 transition-colors"
                    onClick={() => router.push("/won-lost")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-xs text-muted-foreground">
                        Won / Rate
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      {stats.wonLeads}
                      <span className="text-sm font-normal text-muted-foreground ml-1.5">
                        ({stats.winRate}%)
                      </span>
                    </div>
                  </div>

                  <div
                    className="cursor-pointer hover:bg-accent/50 rounded-lg p-3 -m-1 transition-colors"
                    onClick={() => router.push("/appointments")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Appointments
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      {stats.scheduledAppointments}
                      <span className="text-sm font-normal text-muted-foreground ml-1.5">
                        upcoming
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg p-3 -m-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Avg Close Time
                      </span>
                    </div>
                    <div className="text-2xl font-bold">
                      {stats.avgDaysToClose !== null &&
                      stats.avgDaysToClose !== undefined
                        ? `${stats.avgDaysToClose}d`
                        : "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lead Pipeline Breakdown */}
            <Card className="shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                      Lead Pipeline
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/leads?view=all")}
                    className="text-xs h-7"
                  >
                    View All
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      label: "New",
                      count: stats.newLeads,
                      color: "blue",
                      route: "/leads?status=NEW",
                    },
                    {
                      label: "Assigned",
                      count: stats.assignedLeads,
                      color: "yellow",
                      route: "/leads?status=ASSIGNED",
                    },
                    {
                      label: "Appt Set",
                      count: stats.appointmentSetLeads,
                      color: "purple",
                      route: "/leads?status=APPOINTMENT_SET",
                    },
                    {
                      label: "Quoted",
                      count: stats.quotedLeads,
                      color: "orange",
                      route: "/leads?status=QUOTED",
                    },
                  ].map((status) => {
                    const colorClasses: Record<string, string> = {
                      blue: "border-l-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
                      yellow:
                        "border-l-yellow-500 hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20",
                      purple:
                        "border-l-purple-500 hover:bg-purple-50/50 dark:hover:bg-purple-950/20",
                      orange:
                        "border-l-orange-500 hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
                    };
                    return (
                      <div
                        key={status.label}
                        className={`border-l-4 ${colorClasses[status.color]} p-3 rounded-r-lg cursor-pointer transition-colors`}
                        onClick={() => router.push(status.route)}
                      >
                        <div className="text-xs text-muted-foreground mb-0.5">
                          {status.label}
                        </div>
                        <div className="text-xl font-bold">{status.count}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Assigned Calendar Tasks */}
            {assignedTasks.length > 0 && (
              <Card className="shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-purple-500" />
                      <CardTitle className="text-base font-semibold">
                        My Tasks
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {assignedTasks.length}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/calendar")}
                      className="text-xs h-7"
                    >
                      View Calendar
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {assignedTasks.slice(0, 3).map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 cursor-pointer hover:bg-purple-100/50 dark:hover:bg-purple-950/30 transition-colors"
                        onClick={() => router.push("/calendar")}
                      >
                        <Calendar className="h-4 w-4 text-purple-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">
                            {task.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(task.scheduledFor).toLocaleString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              }
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                    ))}
                    {assignedTasks.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={() => router.push("/calendar")}
                      >
                        View {assignedTasks.length - 3} more task
                        {assignedTasks.length - 3 !== 1 ? "s" : ""}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Next Best Actions */}
            {nextActions.length > 0 && (
              <Card className="shadow-sm rounded-2xl">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                      Suggested Actions
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5">
                    {nextActions.map((action, i) => {
                      const Icon = action.icon;
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group"
                          onClick={() => router.push(action.route)}
                        >
                          <Icon
                            className={`h-4 w-4 ${action.color} flex-shrink-0`}
                          />
                          <span className="text-sm flex-1">{action.text}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Team Performance */}
          <div className="lg:col-span-2">
            <Card className="lg:sticky lg:top-4 shadow-sm rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-semibold">
                      Team
                    </CardTitle>
                    {teamStats.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {teamStats.length}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {(
                      [
                        "overdueFollowUps",
                        "totalLeads",
                        "wonLeads",
                      ] as TeamSortKey[]
                    ).map((key) => {
                      const labels: Record<TeamSortKey, string> = {
                        overdueFollowUps: "Overdue",
                        totalLeads: "Leads",
                        wonLeads: "Wins",
                      };
                      return (
                        <Button
                          key={key}
                          variant={teamSortKey === key ? "secondary" : "ghost"}
                          size="sm"
                          className="text-xs h-7 px-2"
                          onClick={() => setTeamSortKey(key)}
                        >
                          {labels[key]}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTeam ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Loading team data...
                  </div>
                ) : sortedTeamStats.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    No team members found
                  </div>
                ) : (
                  <div
                    className={`space-y-1.5 ${sortedTeamStats.length > 6 ? "max-h-[520px] overflow-y-auto pr-1 -mr-1" : ""}`}
                    style={
                      sortedTeamStats.length > 6
                        ? ({
                            scrollbarWidth: "thin",
                            scrollbarColor:
                              "hsl(var(--muted-foreground) / 0.3) transparent",
                          } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {sortedTeamStats.map((member) => (
                      <div
                        key={member.userId}
                        className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${
                          member.overdueFollowUps > 0
                            ? "border-orange-200 dark:border-orange-900 bg-orange-50/30 dark:bg-orange-950/10"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => router.push(`/leads?view=all`)}
                      >
                        {/* Avatar */}
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                          {getInitials(member.userName, member.userEmail)}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">
                              {member.userName || member.userEmail}
                            </span>
                            {member.overdueFollowUps > 0 && (
                              <span className="flex-shrink-0 h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {member.totalLeads} leads
                            </span>
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              {member.wonLeads} won
                            </span>
                            {member.overdueFollowUps > 0 && (
                              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                                {member.overdueFollowUps} overdue
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Action */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 flex-shrink-0"
                          title="View Leads"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/leads?view=all`);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // SALES REP / CONCIERGE DASHBOARD (unchanged)
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Your personal performance overview
        </p>
      </div>

      {/* Mobile Notifications Section */}
      <div className="md:hidden">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <CardTitle className="text-base">Notifications</CardTitle>
                {(unacknowledgedCount > 0 || pastDueAppointmentsCount > 0) && (
                  <span className="h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {unacknowledgedCount + pastDueAppointmentsCount > 9
                      ? "9+"
                      : unacknowledgedCount + pastDueAppointmentsCount}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/tasks")}
                className="text-xs"
              >
                View All
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <CardDescription>
              {unacknowledgedCount > 0 || pastDueAppointmentsCount > 0
                ? `You have ${
                    unacknowledgedCount + pastDueAppointmentsCount
                  } notification${
                    unacknowledgedCount + pastDueAppointmentsCount !== 1
                      ? "s"
                      : ""
                  }`
                : "No new notifications"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Loading notifications...
              </div>
            ) : notifications.length === 0 &&
              pastDueAppointmentsCount === 0 ? null : (
              <div className="space-y-3">
                {pastDueAppointmentsCount > 0 && (
                  <div
                    className="p-3 border rounded-md cursor-pointer hover:bg-accent transition-colors bg-orange-50 dark:bg-orange-950/20"
                    onClick={() => router.push("/appointments?pastDue=true")}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {pastDueAppointmentsCount} Past Due Appointment
                          {pastDueAppointmentsCount !== 1 ? "s" : ""}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Click to view and update status
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border rounded-md cursor-pointer hover:bg-accent transition-colors ${
                      !notification.read
                        ? "bg-blue-50 dark:bg-blue-950/20"
                        : ""
                    }`}
                    onClick={() => {
                      if (notification.type === "CALENDAR_TASK") {
                        router.push("/tasks");
                      } else if (notification.lead) {
                        router.push(`/leads/${notification.lead.id}`);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {getNotificationMessage(notification)}
                        </div>
                        {notification.note && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {notification.note.content}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/tasks")}
                  >
                    View {notifications.length - 3} more notification
                    {notifications.length - 3 !== 1 ? "s" : ""}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {unacknowledgedCount > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/tasks")}
                  >
                    Go to Tasks Page
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Rep Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              My Leads
            </CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.totalLeads}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total assigned leads
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              My Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.totalAppointments}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.scheduledAppointments} upcoming
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.leadToAppointmentRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads to appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Won Leads
            </CardTitle>
            <Award className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">
              {stats.wonLeads}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.winRate}% win rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Competitive Team Leaderboard - Sales Reps Only */}
      <SalesRepTeamPerformance />

      {/* Additional Stats Section */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">
              Lead Status Breakdown
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Current lead distribution by status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div
              className="flex justify-between items-center p-2 -mx-2 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/20 cursor-pointer transition-colors border-l-4 border-blue-500"
              onClick={() => router.push("/leads?status=NEW")}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  New
                </span>
                <span className="text-xs text-green-600 dark:text-green-400">
                  ↑
                </span>
              </div>
              <span className="font-bold text-blue-700 dark:text-blue-300">
                {stats.newLeads}
              </span>
            </div>
            <div
              className="flex justify-between items-center p-2 -mx-2 rounded-md hover:bg-green-50 dark:hover:bg-green-950/20 cursor-pointer transition-colors border-l-4 border-green-500"
              onClick={() => router.push("/leads?status=ASSIGNED")}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Assigned
                </span>
                <span className="text-xs text-muted-foreground">→</span>
              </div>
              <span className="font-bold text-green-700 dark:text-green-300">
                {stats.assignedLeads}
              </span>
            </div>
            <div
              className="flex justify-between items-center p-2 -mx-2 rounded-md hover:bg-purple-50 dark:hover:bg-purple-950/20 cursor-pointer transition-colors border-l-4 border-purple-500"
              onClick={() => router.push("/leads?status=APPOINTMENT_SET")}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Appointment Set
                </span>
                <span className="text-xs text-green-600 dark:text-green-400">
                  ↑
                </span>
              </div>
              <span className="font-bold text-purple-700 dark:text-purple-300">
                {stats.appointmentSetLeads}
              </span>
            </div>
            <div
              className="flex justify-between items-center p-2 -mx-2 rounded-md hover:bg-orange-50 dark:hover:bg-orange-950/20 cursor-pointer transition-colors border-l-4 border-orange-500"
              onClick={() => router.push("/leads?status=QUOTED")}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                  Quoted
                </span>
                <span className="text-xs text-muted-foreground">→</span>
              </div>
              <span className="font-bold text-orange-700 dark:text-orange-300">
                {stats.quotedLeads}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">
              Performance Metrics
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Your key performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Leads with Appointments
              </span>
              <span className="font-semibold">
                {stats.leadsWithAppointments || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Lead → Appointment
              </span>
              <span className="font-semibold">
                {stats.leadToAppointmentRate}%
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Win Rate</span>
              <span className="font-semibold">{stats.winRate}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">
              Recent Appointments
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Your appointment overview
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className="flex justify-between items-center p-2 -mx-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
              onClick={() => router.push("/appointments?status=SCHEDULED")}
            >
              <span className="text-sm font-medium">Upcoming</span>
              <span className="font-bold text-green-600 dark:text-green-400">
                {stats.scheduledAppointments}
              </span>
            </div>
            <div
              className="flex justify-between items-center p-2 -mx-2 rounded-md hover:bg-accent cursor-pointer transition-colors"
              onClick={() => router.push("/appointments?status=COMPLETED")}
            >
              <span className="text-sm font-medium">Completed</span>
              <span className="font-bold">
                {stats.totalAppointments - stats.scheduledAppointments}
              </span>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Total appointments:{" "}
                <span className="font-semibold">
                  {stats.totalAppointments}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
