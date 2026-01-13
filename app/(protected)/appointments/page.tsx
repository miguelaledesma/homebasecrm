"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, User, Filter, AlertTriangle } from "lucide-react"
import { AppointmentStatus } from "@prisma/client"
import { Table } from "antd"
import type { ColumnsType } from "antd/es/table"
import { formatPhoneNumber } from "@/lib/utils"

type Appointment = {
  id: string
  scheduledFor: string
  siteAddressLine1: string | null
  siteAddressLine2: string | null
  city: string | null
  state: string | null
  zip: string | null
  status: AppointmentStatus
  notes: string | null
  createdAt: string
  lead: {
    id: string
    leadTypes: string[]
    status: string
    customer: {
      id: string
      firstName: string
      lastName: string
      phone: string | null
      email: string | null
    }
    assignedSalesRep: {
      id: string
      name: string | null
      email: string
    } | null
  }
  salesRep: {
    id: string
    name: string | null
    email: string
  }
}

type ViewMode = "my" | "all"

export default function AppointmentsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const isSalesRep = session?.user.role === "SALES_REP" || session?.user.role === "CONCIERGE"
  const [viewMode, setViewMode] = useState<ViewMode>(isSalesRep ? "my" : "all")

  // Initialize statusFilter from URL parameters
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const urlStatus = urlParams.get("status")
      if (urlStatus && ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"].includes(urlStatus)) {
        setStatusFilter(urlStatus)
      }
    }
  }, [])

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (viewMode === "my" && isSalesRep) {
        params.append("myAppointments", "true")
      }
      // Check URL parameter for pastDue (from dashboard widget link)
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get("pastDue") === "true") {
        params.append("pastDue", "true")
      }

      const response = await fetch(`/api/appointments?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch appointments")

      const data = await response.json()
      setAppointments(data.appointments)
    } catch (error) {
      console.error("Error fetching appointments:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, viewMode, isSalesRep])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  // Helper function to check if appointment is past due
  const isPastDue = (appointment: Appointment) => {
    if (appointment.status !== "SCHEDULED") return false
    const scheduledDate = new Date(appointment.scheduledFor)
    return scheduledDate < new Date()
  }


  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800"
      case "COMPLETED":
        return "bg-green-100 text-green-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      case "NO_SHOW":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleStatusUpdate = useCallback(async (
    appointmentId: string,
    newStatus: AppointmentStatus,
    event?: React.MouseEvent
  ) => {
    if (event) {
      event.stopPropagation()
    }
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update appointment")
      }

      fetchAppointments()
    } catch (error: any) {
      alert(error.message || "Failed to update appointment")
    }
  }, [fetchAppointments])

  const isViewingAllAppointments = isSalesRep && viewMode === "all"

  const columns: ColumnsType<Appointment> = useMemo(
    () => {
      // For sales reps viewing all appointments, show only customer name and sales rep
      if (isViewingAllAppointments) {
        return [
          {
            title: "Customer",
            dataIndex: ["lead", "customer", "firstName"],
            key: "customer",
            sorter: (a: Appointment, b: Appointment) => {
              const nameA = `${a.lead.customer.firstName} ${a.lead.customer.lastName}`
              const nameB = `${b.lead.customer.firstName} ${b.lead.customer.lastName}`
              return nameA.localeCompare(nameB)
            },
            render: (_: any, record: Appointment) => {
              return (
                <span className="font-medium">
                  {record.lead.customer.firstName} {record.lead.customer.lastName}
                </span>
              )
            },
          },
          {
            title: "Assigned To",
            dataIndex: ["salesRep", "name"],
            key: "assignedTo",
            sorter: (a: Appointment, b: Appointment) => {
              const nameA = a.salesRep.name || a.salesRep.email || ""
              const nameB = b.salesRep.name || b.salesRep.email || ""
              return nameA.localeCompare(nameB)
            },
            render: (_: any, record: Appointment) => {
              return record.salesRep.name || record.salesRep.email
            },
          },
        ]
      }

      // Full columns for admins or sales reps viewing their own appointments
      const baseColumns: ColumnsType<Appointment> = [
        {
          title: "Date & Time",
          dataIndex: "scheduledFor",
          key: "scheduledFor",
          sorter: (a: Appointment, b: Appointment) => {
            return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
          },
          defaultSortOrder: "ascend",
          render: (date: string, record: Appointment) => {
            const formattedDate = new Date(date).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
            const isOverdue = isPastDue(record)
            return (
              <div className="flex items-center gap-2">
                <span className={isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                  {formattedDate}
                </span>
                {isOverdue && (
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
            )
          },
        },
        {
          title: "Customer",
          dataIndex: ["lead", "customer", "firstName"],
          key: "customer",
          sorter: (a: Appointment, b: Appointment) => {
            const nameA = `${a.lead.customer.firstName} ${a.lead.customer.lastName}`
            const nameB = `${b.lead.customer.firstName} ${b.lead.customer.lastName}`
            return nameA.localeCompare(nameB)
          },
          render: (_: any, record: Appointment) => {
            return (
              <Link
                href={`/leads/${record.lead.id}`}
                className="text-primary hover:underline font-medium transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {record.lead.customer.firstName} {record.lead.customer.lastName}
              </Link>
            )
          },
        },
        {
          title: "Phone",
          dataIndex: ["lead", "customer", "phone"],
          key: "phone",
          sorter: (a: Appointment, b: Appointment) => {
            const phoneA = a.lead.customer.phone || ""
            const phoneB = b.lead.customer.phone || ""
            return phoneA.localeCompare(phoneB)
          },
          render: (_: any, record: Appointment) => {
            return record.lead.customer.phone 
              ? formatPhoneNumber(record.lead.customer.phone)
              : "-"
          },
        },
        {
          title: "Status",
          dataIndex: "status",
          key: "status",
          sorter: (a: Appointment, b: Appointment) => a.status.localeCompare(b.status),
          filters: [
            { text: "Scheduled", value: "SCHEDULED" },
            { text: "Completed", value: "COMPLETED" },
            { text: "Cancelled", value: "CANCELLED" },
            { text: "No Show", value: "NO_SHOW" },
          ],
          onFilter: (value: any, record: Appointment) => record.status === value,
          render: (status: AppointmentStatus) => {
            return (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(
                  status
                )}`}
              >
                {status.replace("_", " ")}
              </span>
            )
          },
        },
      ]

      // Add Sales Rep column for admins
      if (session?.user.role === "ADMIN") {
        baseColumns.push({
          title: "Sales Rep",
          dataIndex: ["lead", "assignedSalesRep", "name"],
          key: "salesRep",
          sorter: (a: Appointment, b: Appointment) => {
            const nameA = a.lead.assignedSalesRep?.name || a.lead.assignedSalesRep?.email || "Unassigned"
            const nameB = b.lead.assignedSalesRep?.name || b.lead.assignedSalesRep?.email || "Unassigned"
            return nameA.localeCompare(nameB)
          },
          render: (_: any, record: Appointment) => {
            const assignedSalesRep = record.lead?.assignedSalesRep
            return assignedSalesRep?.name || assignedSalesRep?.email || "Unassigned"
          },
        })
      }

      // Add Actions column
      baseColumns.push({
        title: "Actions",
        key: "actions",
        render: (_: any, record: Appointment) => {
          if (record.status !== "SCHEDULED") {
            return <span className="text-muted-foreground text-sm">-</span>
          }
          return (
            <div
              className="flex gap-1.5 flex-wrap"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={(e) =>
                  handleStatusUpdate(record.id, "COMPLETED", e)
                }
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={(e) =>
                  handleStatusUpdate(record.id, "CANCELLED", e)
                }
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={(e) =>
                  handleStatusUpdate(record.id, "NO_SHOW", e)
                }
              >
                No Show
              </Button>
            </div>
          )
        },
      })

      return baseColumns
    },
    [session?.user.role, handleStatusUpdate, isViewingAllAppointments]
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">
          {isSalesRep && viewMode === "my"
            ? "My Appointments"
            : "Appointments"}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {isSalesRep && viewMode === "my"
            ? "Your scheduled appointments"
            : "Manage your scheduled appointments"}
        </p>
      </div>

      {/* View Mode Tabs - Only show for sales reps */}
      {isSalesRep && (
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setViewMode("my")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              viewMode === "my"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            My Appointments
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              viewMode === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All Appointments
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>
        <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:items-center">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="sm:max-w-[200px]"
          >
            <option value="all">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </Select>
        </div>
        {isViewingAllAppointments && (
          <div className="text-xs text-muted-foreground sm:ml-auto">
            Read-only view
          </div>
        )}
      </div>

      {/* Appointments Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading appointments...
        </div>
      ) : appointments.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No appointments found.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <Table
              dataSource={appointments}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total: number) => `Total ${total} appointments`,
                pageSizeOptions: ["10", "20", "50", "100"],
              }}
              onRow={(record: Appointment) => {
                const isOverdue = isPastDue(record)
                return {
                  onClick: () => {
                    // Only allow navigation if not viewing all appointments as sales rep
                    if (!isViewingAllAppointments) {
                      router.push(`/leads/${record.lead.id}`)
                    }
                  },
                  style: {
                    cursor: isViewingAllAppointments ? "default" : "pointer",
                    backgroundColor: isOverdue ? "rgba(254, 242, 242, 0.5)" : undefined,
                  },
                }
              }}
              scroll={{
                x: "max-content",
                y: 600,
              }}
              size="middle"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
