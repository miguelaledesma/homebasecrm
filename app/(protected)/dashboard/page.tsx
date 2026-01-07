"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, TrendingUp, Target, FileText, CheckCircle, Clock, Award, Bell, AlertCircle, MessageSquare, ArrowRight, AlertTriangle } from "lucide-react"

interface DashboardStats {
  totalLeads: number
  appointmentSetLeads: number
  newLeads: number
  assignedLeads: number
  quotedLeads: number
  wonLeads: number
  totalAppointments: number
  scheduledAppointments: number
  pastDueAppointments?: number
  leadToAppointmentRate: number
  winRate: number
  leadsWithAppointments?: number
}

type Notification = {
  id: string
  type: "LEAD_INACTIVITY" | "ADMIN_COMMENT"
  read: boolean
  acknowledged: boolean
  createdAt: string
  lead: {
    id: string
    customer: {
      firstName: string
      lastName: string
    }
  } | null
  note: {
    id: string
    content: string
    createdByUser: {
      name: string | null
      email: string
    }
  } | null
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/dashboard/stats")
        if (!response.ok) throw new Error("Failed to fetch stats")

        const data = await response.json()
        setStats(data.stats)
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard stats")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const pastDueAppointmentsCount = stats?.pastDueAppointments || 0

  // Fetch notifications for mobile view
  useEffect(() => {
    async function fetchNotifications() {
      if (!session?.user) return

      try {
        setLoadingNotifications(true)
        const response = await fetch("/api/notifications?limit=5")
        if (!response.ok) throw new Error("Failed to fetch notifications")

        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnacknowledgedCount(data.counts?.unacknowledged || 0)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoadingNotifications(false)
      }
    }

    fetchNotifications()
  }, [session?.user])

  const userName = session?.user?.name || "there"
  const isAdmin = session?.user?.role === "ADMIN"

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome{session?.user?.name ? `, ${session.user.name}` : ""}</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Welcome{session?.user?.name ? `, ${session.user.name}` : ""}</h1>
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LEAD_INACTIVITY":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "ADMIN_COMMENT":
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationMessage = (notification: Notification) => {
    if (notification.type === "LEAD_INACTIVITY") {
      const customerName = notification.lead
        ? `${notification.lead.customer.firstName} ${notification.lead.customer.lastName}`
        : "a lead"
      return `No activity on ${customerName} for 48+ hours`
    } else if (notification.type === "ADMIN_COMMENT") {
      const adminName =
        notification.note?.createdByUser.name ||
        notification.note?.createdByUser.email ||
        "Admin"
      return `${adminName} commented on your lead`
    }
    return "New notification"
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome{session?.user?.name ? `, ${session.user.name}` : ""}</h1>
        <p className="text-muted-foreground">
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
                ? `You have ${unacknowledgedCount + pastDueAppointmentsCount} notification${unacknowledgedCount + pastDueAppointmentsCount !== 1 ? "s" : ""}`
                : "No new notifications"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingNotifications ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Loading notifications...
              </div>
            ) : notifications.length === 0 && pastDueAppointmentsCount === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                No notifications
              </div>
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
                      if (notification.lead) {
                        router.push(`/leads/${notification.lead.id}`)
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
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
                    View {notifications.length - 3} more notification{notifications.length - 3 !== 1 ? "s" : ""}
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

      {isAdmin ? (
        // Admin Dashboard
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                All leads in the system
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Appointment Set
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.appointmentSetLeads}
              </div>
              <p className="text-xs text-muted-foreground">
                Leads with appointments scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Scheduled Appointments
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.scheduledAppointments}
              </div>
              <p className="text-xs text-muted-foreground">
                Upcoming appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won Leads</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.wonLeads}</div>
              <p className="text-xs text-muted-foreground">
                {stats.winRate}% win rate
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Sales Rep Dashboard
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLeads}</div>
              <p className="text-xs text-muted-foreground">
                Total assigned leads
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Appointments</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalAppointments}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.scheduledAppointments} upcoming
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conversion Rate
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.leadToAppointmentRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Leads to appointments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Won Leads</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.wonLeads}</div>
              <p className="text-xs text-muted-foreground">
                {stats.winRate}% win rate
              </p>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Additional Stats Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead Status Breakdown</CardTitle>
            <CardDescription>Current lead distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">New</span>
              <span className="font-semibold">{stats.newLeads}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Assigned</span>
              <span className="font-semibold">{stats.assignedLeads}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Appointment Set
              </span>
              <span className="font-semibold">
                {stats.appointmentSetLeads}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Quoted</span>
              <span className="font-semibold">{stats.quotedLeads}</span>
            </div>
          </CardContent>
        </Card>

        {!isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Metrics</CardTitle>
              <CardDescription>Your key performance indicators</CardDescription>
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
            <CardTitle className="text-base">Appointments</CardTitle>
            <CardDescription>
              {isAdmin ? "All appointments" : "Your appointments"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-semibold">{stats.totalAppointments}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Scheduled</span>
              <span className="font-semibold">
                {stats.scheduledAppointments}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

