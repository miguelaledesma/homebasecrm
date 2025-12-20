"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, TrendingUp, Target, FileText, CheckCircle, Clock, Award } from "lucide-react"

interface DashboardStats {
  totalLeads: number
  appointmentSetLeads: number
  newLeads: number
  assignedLeads: number
  quotedLeads: number
  wonLeads: number
  totalAppointments: number
  scheduledAppointments: number
  leadToAppointmentRate: number
  winRate: number
  leadsWithAppointments?: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const isAdmin = session?.user?.role === "ADMIN"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Overview of all leads and appointments"
            : "Your personal performance overview"}
        </p>
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

