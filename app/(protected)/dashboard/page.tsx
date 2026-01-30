"use client";

import { useState, useEffect } from "react";
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
import {
  Users,
  Calendar,
  TrendingUp,
  Target,
  FileText,
  CheckCircle,
  Clock,
  Award,
  Bell,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  UserPlus,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { TeamPerformanceWidget } from "@/components/team-performance-widget";

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
}

type Notification = {
  id: string;
  type: "LEAD_INACTIVITY" | "ADMIN_COMMENT" | "CONCIERGE_LEAD" | "CALENDAR_TASK";
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

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

  const pastDueAppointmentsCount = stats?.pastDueAppointments || 0;

  // Fetch notifications for mobile view
  useEffect(() => {
    async function fetchNotifications() {
      if (!session?.user) return;

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
  }, [session?.user]);

  // Fetch assigned calendar tasks for admins
  useEffect(() => {
    async function fetchAssignedTasks() {
      if (!session?.user || session.user.role !== "ADMIN") return;

      try {
        setLoadingTasks(true);
        const response = await fetch("/api/calendar/assigned-tasks?upcomingOnly=true&limit=5");
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
  }, [session?.user]);

  const userName = session?.user?.name || "there";
  const isAdmin = session?.user?.role === "ADMIN";
  const isConcierge = session?.user?.role === "CONCIERGE";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          {isAdmin
            ? "Overview of all leads and appointments"
            : "Your personal performance overview"}
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
            ) : notifications.length === 0 && pastDueAppointmentsCount === 0 ? (
              null
            ) : (
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
                      !notification.read ? "bg-blue-50 dark:bg-blue-950/20" : ""
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

      {isAdmin && !isConcierge ? (
        // Admin Dashboard (only for ADMIN, not CONCIERGE)
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push("/leads?view=all")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Total Leads
              </CardTitle>
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {stats.totalLeads}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All leads in the system
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer border-blue-200 dark:border-blue-800"
            onClick={() => router.push("/leads?view=unassigned")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Unassigned Leads
              </CardTitle>
              <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.unassignedLeads || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Need sales rep assignment
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20"
            onClick={() => router.push("/leads?showOverdue=true")}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">
                Overdue Follow-ups
              </CardTitle>
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.overdueFollowUps || 0}
              </div>
              <p className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push("/won-lost")}
          >
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

          {stats.jobsPendingFinancials !== undefined && stats.jobsPendingFinancials > 0 && (
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20"
              onClick={() => router.push("/quotes?status=ACCEPTED")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">
                  Financials Pending
                </CardTitle>
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.jobsPendingFinancials}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Completed jobs need expense tracking
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        // Sales Rep Dashboard
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
      )}

      {/* Team Performance Widget - Admin Only */}
      {isAdmin && !isConcierge && (
        <TeamPerformanceWidget />
      )}

      {/* Assigned Calendar Tasks - Admin Only */}
      {isAdmin && !isConcierge && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle className="text-base">My Assigned Tasks</CardTitle>
                {assignedTasks.length > 0 && (
                  <span className="h-5 w-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">
                    {assignedTasks.length > 9 ? "9+" : assignedTasks.length}
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/calendar")}
                className="text-xs"
              >
                View Calendar
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
            <CardDescription>
              {assignedTasks.length > 0
                ? `You have ${assignedTasks.length} upcoming task${assignedTasks.length !== 1 ? "s" : ""}`
                : "No assigned tasks"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Loading tasks...
              </div>
            ) : assignedTasks.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                No tasks assigned to you
              </div>
            ) : (
              <div className="space-y-3">
                {assignedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 border rounded-md cursor-pointer hover:bg-accent transition-colors bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
                    onClick={() => router.push("/calendar")}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(task.scheduledFor).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </div>
                        {task.user && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Assigned by: {task.user.name || task.user.email}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {assignedTasks.length >= 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/calendar")}
                  >
                    View All Tasks
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

        {!isAdmin && (
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
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">
              Recent Appointments
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isAdmin
                ? "System-wide appointment overview"
                : "Your appointment overview"}
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
                <span className="font-semibold">{stats.totalAppointments}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Section - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm sm:text-base">
              Quick Actions
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Common admin tasks and views
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                onClick={() => router.push("/leads?view=unassigned")}
              >
                <div className="flex items-center gap-2 sm:gap-3 w-full">
                  <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-xs sm:text-sm truncate">
                      Unassigned Leads
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stats.unassignedLeads || 0} leads
                    </div>
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                onClick={() => router.push("/leads?showOverdue=true")}
              >
                <div className="flex items-center gap-2 sm:gap-3 w-full">
                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-xs sm:text-sm truncate">
                      Overdue Follow-ups
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {stats.overdueFollowUps || 0} leads
                    </div>
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                onClick={() => router.push("/jobs")}
              >
                <div className="flex items-center gap-2 sm:gap-3 w-full">
                  <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-xs sm:text-sm truncate">
                      Jobs
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Projects being worked on
                    </div>
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                onClick={() => router.push("/admin")}
              >
                <div className="flex items-center gap-2 sm:gap-3 w-full">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <div className="text-left min-w-0 flex-1">
                    <div className="font-semibold text-xs sm:text-sm truncate">
                      Team Management
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Users & roles
                    </div>
                  </div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
