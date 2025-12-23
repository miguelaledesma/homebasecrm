"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, MapPin, User } from "lucide-react"
import { AppointmentStatus } from "@prisma/client"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ModuleRegistry, AllCommunityModule } from "ag-grid-community"

import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

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
  }
  salesRep: {
    id: string
    name: string | null
    email: string
  }
}

export default function AppointmentsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const fetchAppointments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
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
  }, [statusFilter])

  useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

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

  const handleStatusUpdate = async (
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
  }

  const columnDefs: ColDef[] = useMemo(
    () => [
      {
        field: "scheduledFor",
        headerName: "Date & Time",
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => {
          const date = new Date(params.data.scheduledFor)
          return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        },
        sort: "asc",
      },
      {
        field: "customer.name",
        headerName: "Customer",
        valueGetter: (params) => {
          return `${params.data.lead.customer.firstName} ${params.data.lead.customer.lastName}`
        },
        flex: 1,
        minWidth: 150,
        cellRenderer: (params: any) => {
          return (
            <Link
              href={`/leads/${params.data.lead.id}`}
              className="text-primary hover:underline font-medium transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {params.value}
            </Link>
          )
        },
      },
      {
        field: "customer.phone",
        headerName: "Phone",
        valueGetter: (params) => {
          return params.data.lead.customer.phone || "-"
        },
        flex: 1,
        minWidth: 120,
      },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        minWidth: 140,
        cellRenderer: (params: any) => {
          const status = params.value as AppointmentStatus
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
      ...(session?.user.role === "ADMIN"
        ? [
            {
              field: "salesRep.name",
              headerName: "Sales Rep",
              valueGetter: (params) => {
                return (
                  params.data.salesRep.name || params.data.salesRep.email
                )
              },
              flex: 1,
              minWidth: 150,
            },
          ]
        : []),
      {
        field: "actions",
        headerName: "Actions",
        flex: 1,
        minWidth: 200,
        cellRenderer: (params: any) => {
          if (params.data.status !== "SCHEDULED") {
            return (
              <span className="text-muted-foreground text-sm">-</span>
            )
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
                  handleStatusUpdate(params.data.id, "COMPLETED", e)
                }
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={(e) =>
                  handleStatusUpdate(params.data.id, "CANCELLED", e)
                }
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={(e) =>
                  handleStatusUpdate(params.data.id, "NO_SHOW", e)
                }
              >
                No Show
              </Button>
            </div>
          )
        },
        sortable: false,
        filter: false,
      },
    ],
    [session?.user.role, handleStatusUpdate]
  )

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      cellStyle: {
        display: "flex",
        alignItems: "center",
      },
    }),
    []
  )

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Appointments</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage your scheduled appointments
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <div
              className="ag-theme-alpine rounded-lg overflow-hidden"
              style={{ height: "650px", width: "100%" }}
            >
              <AgGridReact
                rowData={appointments}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onRowClicked={(event) => {
                  router.push(`/leads/${event.data.lead.id}`)
                }}
                rowStyle={{ cursor: "pointer" }}
                pagination={true}
                paginationPageSize={20}
                suppressCellFocus={true}
                animateRows={true}
                rowHeight={56}
                headerHeight={48}
                suppressRowClickSelection={false}
                enableCellTextSelection={true}
                ensureDomOrder={true}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
