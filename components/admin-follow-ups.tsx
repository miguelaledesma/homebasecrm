"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, User, Clock, CheckSquare } from "lucide-react"

type InactiveLead = {
  leadId: string
  customer: {
    firstName: string
    lastName: string
    phone: string | null
    email: string | null
  }
  salesRep: {
    id: string
    name: string | null
    email: string
  }
  lastActivity: string
  hoursInactive: number
  task: {
    id: string
    status: string
  } | null
}

type SalesRepStats = {
  id: string
  name: string | null
  email: string
  inactiveCount: number
  averageHoursInactive: number
  unacknowledgedTasks: number
}

type FollowUpsData = {
  summary: {
    totalInactiveLeads: number
    totalUnacknowledgedTasks: number
    salesRepStats: SalesRepStats[]
  }
  inactiveLeads: InactiveLead[]
}

export function AdminFollowUps() {
  const router = useRouter()
  const [data, setData] = useState<FollowUpsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [salesRepFilter, setSalesRepFilter] = useState<string>("all")
  const [hoursFilter, setHoursFilter] = useState<string>("all")
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>("all")
  const [salesReps, setSalesReps] = useState<SalesRepStats[]>([])

  const fetchFollowUps = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (salesRepFilter !== "all") {
        params.append("salesRepId", salesRepFilter)
      }
      if (hoursFilter !== "all") {
        const [min, max] = hoursFilter.split("-").map(Number)
        params.append("hoursMin", min.toString())
        if (max) {
          params.append("hoursMax", max.toString())
        }
      }
      if (taskStatusFilter !== "all") {
        params.append("taskStatus", taskStatusFilter)
      }

      const response = await fetch(`/api/admin/follow-ups?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch follow-ups")

      const data = await response.json()
      setData(data)
      setSalesReps(data.summary.salesRepStats || [])
    } catch (error) {
      console.error("Error fetching follow-ups:", error)
    } finally {
      setLoading(false)
    }
  }, [salesRepFilter, hoursFilter, taskStatusFilter])

  useEffect(() => {
    fetchFollowUps()
  }, [fetchFollowUps])

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>
  }

  if (!data) {
    return <div className="text-muted-foreground">No data available</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Total Inactive Leads</div>
          <div className="text-2xl font-bold">{data.summary.totalInactiveLeads}</div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Unacknowledged Tasks</div>
          <div className="text-2xl font-bold text-orange-600">
            {data.summary.totalUnacknowledgedTasks}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-muted-foreground">Sales Reps with Inactive Leads</div>
          <div className="text-2xl font-bold">{salesReps.length}</div>
        </div>
      </div>

      {/* Sales Rep Stats */}
      {salesReps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Inactive Leads by Sales Rep</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Sales Rep</th>
                  <th className="text-left p-3 text-sm font-medium">Inactive Leads</th>
                  <th className="text-left p-3 text-sm font-medium">Avg Hours Inactive</th>
                  <th className="text-left p-3 text-sm font-medium">Unacknowledged Tasks</th>
                </tr>
              </thead>
              <tbody>
                {salesReps.map((rep) => (
                  <tr key={rep.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{rep.name || rep.email}</span>
                      </div>
                    </td>
                    <td className="p-3">{rep.inactiveCount}</td>
                    <td className="p-3">{rep.averageHoursInactive} hrs</td>
                    <td className="p-3">
                      {rep.unacknowledgedTasks > 0 ? (
                        <span className="text-orange-600 font-semibold">
                          {rep.unacknowledgedTasks}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="text-sm font-medium mb-1 block">Sales Rep</label>
          <select
            value={salesRepFilter}
            onChange={(e) => setSalesRepFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All</option>
            {salesReps.map((rep) => (
              <option key={rep.id} value={rep.id}>
                {rep.name || rep.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Hours Inactive</label>
          <select
            value={hoursFilter}
            onChange={(e) => setHoursFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All</option>
            <option value="48-72">48-72 hours</option>
            <option value="72-96">72-96 hours</option>
            <option value="96">96+ hours</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Task Status</label>
          <select
            value={taskStatusFilter}
            onChange={(e) => setTaskStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All</option>
            <option value="PENDING">Pending</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Detailed Table */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Inactive Leads</h3>
        {data.inactiveLeads.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No inactive leads found
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Sales Rep</th>
                  <th className="text-left p-3 text-sm font-medium">Customer</th>
                  <th className="text-left p-3 text-sm font-medium">Last Activity</th>
                  <th className="text-left p-3 text-sm font-medium">Hours Inactive</th>
                  <th className="text-left p-3 text-sm font-medium">Task Status</th>
                  <th className="text-left p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.inactiveLeads.map((lead) => (
                  <tr key={lead.leadId} className="border-t hover:bg-accent">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="text-sm">
                          {lead.salesRep.name || lead.salesRep.email}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">
                        {lead.customer.firstName} {lead.customer.lastName}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-muted-foreground">
                        {new Date(lead.lastActivity).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium">{lead.hoursInactive} hrs</span>
                      </div>
                    </td>
                    <td className="p-3">
                      {lead.task ? (
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            lead.task.status === "PENDING"
                              ? "bg-orange-100 text-orange-800"
                              : lead.task.status === "ACKNOWLEDGED"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {lead.task.status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No task</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/leads/${lead.leadId}`)}
                      >
                        View Lead
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

