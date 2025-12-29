"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Filter } from "lucide-react"
import { LeadStatus } from "@prisma/client"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import { formatLeadTypes, formatLeadType } from "@/lib/utils"

import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"

// Register AG Grid modules
ModuleRegistry.registerModules([AllCommunityModule])

type Lead = {
  id: string
  leadTypes: string[]
  description: string | null
  status: LeadStatus
  assignedSalesRepId: string | null
  createdAt: string
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

export default function LeadsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [myLeadsOnly, setMyLeadsOnly] = useState(false)

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (myLeadsOnly) {
        params.append("myLeads", "true")
      }

      const response = await fetch(`/api/leads?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch leads")

      const data = await response.json()
      setLeads(data.leads)
    } catch (error) {
      console.error("Error fetching leads:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, myLeadsOnly])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-800"
      case "ASSIGNED":
        return "bg-yellow-100 text-yellow-800"
      case "APPOINTMENT_SET":
        return "bg-purple-100 text-purple-800"
      case "QUOTED":
        return "bg-orange-100 text-orange-800"
      case "WON":
        return "bg-green-100 text-green-800"
      case "LOST":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isSalesRep = session?.user.role === "SALES_REP"
  const isViewingAllLeads = isSalesRep && !myLeadsOnly

  const columnDefs: ColDef[] = useMemo(
    () => {
      // For sales reps viewing all leads, show only name and assigned to
      if (isViewingAllLeads) {
        return [
          {
            field: "customer.name",
            headerName: "Customer",
            valueGetter: (params) => {
              return `${params.data.customer.firstName} ${params.data.customer.lastName}`
            },
            flex: 1,
            minWidth: 200,
            cellRenderer: (params: any) => {
              // Don't make it clickable for sales reps viewing all leads
              return (
                <span className="font-medium">
                  {params.value}
                </span>
              )
            },
          },
          {
            field: "assignedSalesRep.name",
            headerName: "Assigned To",
            valueGetter: (params) => {
              if (!params.data.assignedSalesRep) return "-"
              return (
                params.data.assignedSalesRep.name ||
                params.data.assignedSalesRep.email
              )
            },
            flex: 1,
            minWidth: 200,
          },
        ]
      }

      // Full columns for admins or sales reps viewing their own leads
      return [
        {
          field: "customer.name",
          headerName: "Customer",
          valueGetter: (params) => {
            return `${params.data.customer.firstName} ${params.data.customer.lastName}`
          },
          flex: 1,
          minWidth: 150,
          cellRenderer: (params: any) => {
            return (
              <Link
                href={`/leads/${params.data.id}`}
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
          valueGetter: (params) => params.data.customer.phone || "-",
          flex: 1,
          minWidth: 120,
        },
        {
          field: "customer.email",
          headerName: "Email",
          valueGetter: (params) => params.data.customer.email || "-",
          flex: 1,
          minWidth: 180,
        },
        {
          field: "leadTypes",
          headerName: "Type",
          flex: 1,
          minWidth: 100,
          valueGetter: (params) => formatLeadTypes(params.data.leadTypes || []),
          cellRenderer: (params: any) => {
            const types = params.data.leadTypes || []
            return (
              <div className="flex flex-wrap gap-1">
                {types.map((type: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground"
                  >
                    {formatLeadType(type)}
                  </span>
                ))}
              </div>
            )
          },
        },
        {
          field: "status",
          headerName: "Status",
          flex: 1,
          minWidth: 140,
          cellRenderer: (params: any) => {
            const status = params.value as LeadStatus
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
        {
          field: "assignedSalesRep.name",
          headerName: "Assigned To",
          valueGetter: (params) => {
            if (!params.data.assignedSalesRep) return "-"
            return (
              params.data.assignedSalesRep.name ||
              params.data.assignedSalesRep.email
            )
          },
          flex: 1,
          minWidth: 150,
        },
        {
          field: "createdAt",
          headerName: "Created",
          valueGetter: (params) => {
            return new Date(params.data.createdAt).toLocaleDateString()
          },
          flex: 1,
          minWidth: 100,
        },
      ]
    },
    [isViewingAllLeads]
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Leads</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage and track your leads</p>
        </div>
        <Link href="/leads/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </Link>
      </div>

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
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="APPOINTMENT_SET">Appointment Set</option>
            <option value="QUOTED">Quoted</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </Select>
          {session?.user.role === "SALES_REP" && (
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={myLeadsOnly}
                onChange={(e) => setMyLeadsOnly(e.target.checked)}
                className="rounded"
              />
              <span>My Leads Only</span>
            </label>
          )}
        </div>
        {isViewingAllLeads && (
          <div className="text-xs text-muted-foreground sm:ml-auto">
            Read-only view
          </div>
        )}
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading leads...
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No leads found.{" "}
            <Link href="/leads/new" className="text-primary hover:underline">
              Create your first lead
            </Link>
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
                rowData={leads}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onRowClicked={(event) => {
                  // Only allow navigation if not viewing all leads as sales rep
                  if (!isViewingAllLeads) {
                    router.push(`/leads/${event.data.id}`)
                  }
                }}
                rowStyle={{ cursor: isViewingAllLeads ? "default" : "pointer" }}
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
