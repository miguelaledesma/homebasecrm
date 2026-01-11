"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Filter, AlertCircle, Bell, X } from "lucide-react"
import { LeadStatus } from "@prisma/client"
import { AgGridReact } from "ag-grid-react"
import { ColDef, ModuleRegistry, AllCommunityModule } from "ag-grid-community"
import { formatLeadTypes, formatLeadType, formatPhoneNumber } from "@/lib/utils"

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
  isInactive?: boolean
  hoursSinceActivity?: number | null
  lastActivityTimestamp?: string | null
  needsFollowUp?: boolean
}

type ViewMode = "my" | "all" | "unassigned"

export default function LeadsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showInactiveOnly, setShowInactiveOnly] = useState(false)
  const [dismissedAlert, setDismissedAlert] = useState(false)
  const isSalesRep = session?.user.role === "SALES_REP" || session?.user.role === "CONCIERGE"
  const isAdmin = session?.user.role === "ADMIN"
  
  // Initialize viewMode from URL params, localStorage, or default based on role
  const getInitialViewMode = (): ViewMode => {
    if (typeof window !== "undefined") {
      // First check URL params
      const urlParams = new URLSearchParams(window.location.search)
      const urlViewMode = urlParams.get("view") as ViewMode | null
      if (urlViewMode && ["my", "all", "unassigned"].includes(urlViewMode)) {
        return urlViewMode
      }
      
      // Then check localStorage as fallback
      const storedViewMode = localStorage.getItem("leadsViewMode") as ViewMode | null
      if (storedViewMode && ["my", "all", "unassigned"].includes(storedViewMode)) {
        return storedViewMode
      }
    }
    return isSalesRep ? "my" : "all"
  }
  
  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode())
  
  // Sync viewMode from URL on mount (in case URL changed externally)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      const urlViewMode = urlParams.get("view") as ViewMode | null
      if (urlViewMode && ["my", "all", "unassigned"].includes(urlViewMode) && urlViewMode !== viewMode) {
        setViewMode(urlViewMode)
      }
    }
  }, [viewMode])
  
  // Update URL and localStorage when viewMode changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search)
      urlParams.set("view", viewMode)
      
      // Store in localStorage as backup
      localStorage.setItem("leadsViewMode", viewMode)
      
      const newUrl = `/leads?${urlParams.toString()}`
      // Only update if URL actually changed to avoid infinite loops
      if (window.location.pathname + window.location.search !== newUrl) {
        router.replace(newUrl, { scroll: false })
      }
    }
  }, [viewMode, router])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (viewMode === "my" && isSalesRep) {
        params.append("myLeads", "true")
      } else if (viewMode === "unassigned") {
        params.append("unassigned", "true")
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
  }, [statusFilter, viewMode, isSalesRep])

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

  const isViewingAllLeads = isSalesRep && viewMode === "all"

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = [...leads]
    
    // Filter by inactive if needed
    if (showInactiveOnly) {
      result = result.filter((lead) => lead.isInactive === true)
    }
    
    // Auto-sort: inactive leads first
    result.sort((a, b) => {
      if (a.isInactive && !b.isInactive) return -1
      if (!a.isInactive && b.isInactive) return 1
      return 0
    })
    
    return result
  }, [leads, showInactiveOnly])

  // Fetch sales rep's own leads separately to calculate inactive count for banner
  const [myLeadsForCount, setMyLeadsForCount] = useState<Lead[]>([])
  
  const fetchMyLeadsForCount = useCallback(async () => {
    if (isSalesRep) {
      try {
        const response = await fetch(`/api/leads?myLeads=true`)
        if (response.ok) {
          const data = await response.json()
          setMyLeadsForCount(data.leads || [])
        }
      } catch (error) {
        console.error("Error fetching my leads for count:", error)
      }
    }
  }, [isSalesRep])
  
  useEffect(() => {
    fetchMyLeadsForCount()
  }, [fetchMyLeadsForCount])
  
  // Count inactive leads - use myLeadsForCount for sales reps, otherwise use current leads
  const inactiveCount = useMemo(() => {
    const leadsToCount = (isSalesRep && myLeadsForCount.length > 0) ? myLeadsForCount : leads
    return leadsToCount.filter((lead) => lead.isInactive === true).length
  }, [leads, myLeadsForCount, isSalesRep])

  // Format time since activity
  const formatTimeSinceActivity = (hours: number | null | undefined): string => {
    if (hours === null || hours === undefined) return "Closed/Inactive"
    if (hours < 24) return "Today"
    const days = Math.floor(hours / 24)
    if (days === 1) return "1 day ago"
    return `${days} days ago`
  }

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
          valueGetter: (params) => 
            params.data.customer.phone 
              ? formatPhoneNumber(params.data.customer.phone)
              : "-",
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
          minWidth: 150,
          maxWidth: 250,
          valueGetter: (params) => formatLeadTypes(params.data.leadTypes || []),
          cellRenderer: (params: any) => {
            const types = params.data.leadTypes || []
            const maxVisible = 2
            const visibleTypes = types.slice(0, maxVisible)
            const remainingCount = types.length - maxVisible
            
            if (types.length === 0) {
              return <span className="text-muted-foreground text-xs">-</span>
            }
            
            return (
              <div className="flex items-center gap-1 flex-wrap" title={formatLeadTypes(types)}>
                {visibleTypes.map((type: string, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground whitespace-nowrap"
                  >
                    {formatLeadType(type)}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground whitespace-nowrap">
                    +{remainingCount} more
                  </span>
                )}
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
        // Only show Last Activity column for admins or sales reps viewing their own leads
        ...((isAdmin || (isSalesRep && viewMode === "my")) ? [{
          field: "lastActivityTimestamp",
          headerName: "Last Activity",
          valueGetter: (params: any) => {
            return formatTimeSinceActivity(params.data.hoursSinceActivity)
          },
          flex: 1,
          minWidth: 150,
          cellRenderer: (params: any) => {
            const isInactive = params.data.isInactive
            const timeText = params.value
            
            return (
              <div className="flex items-center gap-2">
                {isInactive && (
                  <Bell className="h-4 w-4 text-amber-600" />
                )}
                <span className={isInactive ? "text-amber-700 font-medium" : ""}>
                  {timeText}
                </span>
              </div>
            )
          },
        }] : []),
      ]
    },
    [isViewingAllLeads, isAdmin, isSalesRep, viewMode]
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
          <h1 className="text-2xl md:text-3xl font-bold">
            {isSalesRep && viewMode === "my"
              ? "My Leads"
              : isSalesRep && viewMode === "unassigned"
              ? "Unassigned Leads"
              : "Leads"}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {isSalesRep && viewMode === "my"
              ? "Your assigned leads"
              : isSalesRep && viewMode === "unassigned"
              ? "Leads available to claim"
              : "Manage and track your leads"}
          </p>
        </div>
        <Link href="/leads/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            New Lead
          </Button>
        </Link>
      </div>

      {/* Alert Banner for Inactive Leads - Show for admins or sales reps on any tab */}
      {!dismissedAlert && inactiveCount > 0 && (isAdmin || isSalesRep) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  {inactiveCount} {inactiveCount === 1 ? "lead needs" : "leads need"} follow-up
                </h3>
                <p className="text-sm text-amber-700 mb-3">
                  These leads have been inactive for over 48 hours. Please update the status, add a note, or contact an Admin to close or mark as Won.
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700"
                    onClick={() => setShowInactiveOnly(true)}
                  >
                    View Inactive Leads
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                    onClick={() => setDismissedAlert(true)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setDismissedAlert(true)}
                className="text-amber-600 hover:text-amber-900 transition-colors"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

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
            My Leads
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              viewMode === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All Leads
          </button>
          <button
            onClick={() => setViewMode("unassigned")}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              viewMode === "unassigned"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Unassigned Leads
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
            <option value="NEW">New</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="APPOINTMENT_SET">Appointment Set</option>
            <option value="QUOTED">Quoted</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </Select>
          {/* Show inactive filter only for admins or sales reps viewing their own leads */}
          {(isAdmin || (isSalesRep && viewMode === "my")) && (
            <label className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-3 py-2 rounded-md transition-colors">
              <input
                type="checkbox"
                checked={showInactiveOnly}
                onChange={(e) => {
                  setShowInactiveOnly(e.target.checked)
                  if (e.target.checked) setDismissedAlert(true)
                }}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="flex items-center gap-1.5">
                <Bell className="h-4 w-4 text-amber-600" />
                <span className="text-amber-900 font-medium">Show only inactive leads</span>
                {inactiveCount > 0 && (
                  <Badge className="ml-1 bg-amber-100 text-amber-800 border-amber-300 text-xs">
                    {inactiveCount}
                  </Badge>
                )}
              </span>
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
                rowData={filteredLeads}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                onRowClicked={(event) => {
                  // Only allow navigation if not viewing all leads as sales rep
                  if (!isViewingAllLeads) {
                    router.push(`/leads/${event.data.id}`)
                  }
                }}
                {...({
                  rowStyle: (params: any) => {
                    const baseStyle: any = { cursor: isViewingAllLeads ? "default" : "pointer" }
                    // Highlight inactive leads with amber left border and subtle background
                    if (params.data?.isInactive) {
                      return { 
                        ...baseStyle, 
                        backgroundColor: "#fffbeb", // amber-50
                        borderLeft: "4px solid #fbbf24", // amber-400
                        paddingLeft: "8px"
                      }
                    }
                    return baseStyle
                  }
                } as any)}
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
