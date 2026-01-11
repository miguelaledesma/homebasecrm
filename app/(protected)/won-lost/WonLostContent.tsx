"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Search, ArrowRight, ChevronLeft, ChevronRight, Clock3 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatLeadType, formatPhoneNumber } from "@/lib/utils"

type LeadTypeValue =
  | "FLOOR"
  | "CARPET"
  | "TILE_STONE"
  | "MATERIALS"
  | "KITCHEN"
  | "BATH"
  | "ADUS"
  | "PAINTING"
  | "ROOFING"
  | "STUCCO"
  | "CONCRETE"
  | "TURF"
  | "LANDSCAPING"
  | "MONTHLY_YARD_MAINTENANCE"
  | "OTHER"

type ClosedLead = {
  id: string
  status: "WON" | "LOST"
  closedDate: string | null
  createdAt: string
  daysToClose?: number | null
  leadTypes: LeadTypeValue[]
  customer: {
    firstName: string
    lastName: string
    phone: string | null
    email: string | null
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    state: string | null
    zip: string | null
    sourceType: string
  }
  assignedSalesRep: { id: string; name: string | null; email: string } | null
  dealValue: number
  lossReason?: string | null
  jobStatus?: string | null
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value || 0
  )

const formatDate = (value?: string | null) => {
  if (!value) return "-"
  return new Date(value).toLocaleDateString()
}

const computeDaysToClose = (createdAt: string, closedDate?: string | null) => {
  if (!closedDate) return null
  const start = new Date(createdAt).getTime()
  const end = new Date(closedDate).getTime()
  const diff = end - start
  if (diff < 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const ITEMS_PER_PAGE = 10

export function WonLostContent() {
  const [wonLeads, setWonLeads] = useState<ClosedLead[]>([])
  const [lostLeads, setLostLeads] = useState<ClosedLead[]>([])
  const [activeTab, setActiveTab] = useState<"won" | "lost">("won")
  const [search, setSearch] = useState("")
  const [sortWon, setSortWon] = useState<string>("date_desc")
  const [sortLost, setSortLost] = useState<string>("date_desc")
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [currentPageWon, setCurrentPageWon] = useState(1)
  const [currentPageLost, setCurrentPageLost] = useState(1)

  const fetchLeads = async () => {
    setLoadingLeads(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())

      const [wonRes, lostRes] = await Promise.all([
        fetch(`/api/leads/won?${params.toString()}`),
        fetch(`/api/leads/lost?${params.toString()}`),
      ])

      if (!wonRes.ok) throw new Error("Failed to fetch won leads")
      if (!lostRes.ok) throw new Error("Failed to fetch lost leads")

      const wonData = await wonRes.json()
      const lostData = await lostRes.json()
      setWonLeads(
        (wonData.leads || []).map((lead: ClosedLead) => ({
          ...lead,
          daysToClose: computeDaysToClose(lead.createdAt, lead.closedDate),
        }))
      )
      setLostLeads(
        (lostData.leads || []).map((lead: ClosedLead) => ({
          ...lead,
          daysToClose: computeDaysToClose(lead.createdAt, lead.closedDate),
        }))
      )
    } finally {
      setLoadingLeads(false)
    }
  }

  useEffect(() => {
    fetchLeads().catch((err) => console.error(err))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPageWon(1)
    setCurrentPageLost(1)
  }, [search])

  const sortedWon = useMemo(() => {
    const [field, dir] = sortWon.split("_")
    const direction = dir === "asc" ? 1 : -1
    return [...wonLeads].sort((a, b) => {
      if (field === "value") {
        return (a.dealValue || 0) > (b.dealValue || 0) ? direction : -direction
      }
      if (field === "days") {
        return (a.daysToClose || 0) > (b.daysToClose || 0) ? direction : -direction
      }
      const aDate = a.closedDate || a.createdAt
      const bDate = b.closedDate || b.createdAt
      return aDate > bDate ? direction : -direction
    })
  }, [wonLeads, sortWon])

  const sortedLost = useMemo(() => {
    const [field, dir] = sortLost.split("_")
    const direction = dir === "asc" ? 1 : -1
    return [...lostLeads].sort((a, b) => {
      if (field === "value") {
        return (a.dealValue || 0) > (b.dealValue || 0) ? direction : -direction
      }
      const aDate = a.closedDate || a.createdAt
      const bDate = b.closedDate || b.createdAt
      return aDate > bDate ? direction : -direction
    })
  }, [lostLeads, sortLost])

  // Pagination logic
  const paginatedWon = useMemo(() => {
    const start = (currentPageWon - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return sortedWon.slice(start, end)
  }, [sortedWon, currentPageWon])

  const paginatedLost = useMemo(() => {
    const start = (currentPageLost - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return sortedLost.slice(start, end)
  }, [sortedLost, currentPageLost])

  const totalPagesWon = Math.ceil(sortedWon.length / ITEMS_PER_PAGE)
  const totalPagesLost = Math.ceil(sortedLost.length / ITEMS_PER_PAGE)

  const renderLeadCard = (lead: ClosedLead) => {
    const name = `${lead.customer.firstName} ${lead.customer.lastName}`
    const addressParts = [
      lead.customer.addressLine1,
      lead.customer.addressLine2,
      [lead.customer.city, lead.customer.state].filter(Boolean).join(", "),
      lead.customer.zip,
    ].filter(Boolean)

    const badgeColor =
      lead.status === "WON"
        ? "bg-green-100 text-green-700 border-green-200"
        : "bg-red-100 text-red-700 border-red-200"

    return (
      <Card key={lead.id} className="hover:shadow-md transition-shadow border-muted">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-lg">{name}</CardTitle>
                <Badge className={badgeColor}>{lead.status === "WON" ? "Won" : "Lost"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {lead.assignedSalesRep
                  ? lead.assignedSalesRep.name || lead.assignedSalesRep.email
                  : "Unassigned"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Deal Value</p>
              <p className="text-xl font-semibold text-foreground">{formatCurrency(lead.dealValue)}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Closed Date</p>
              <p className="font-medium">{formatDate(lead.closedDate || lead.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Days to Close</p>
              <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 w-fit">
                <Clock3 className="h-3.5 w-3.5" />
                <span className="font-semibold">{lead.daysToClose ?? "-"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Service Type</p>
              <div className="flex flex-wrap gap-1">
                {lead.leadTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="text-xs">
                    {formatLeadType(type)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Contact</p>
              <p className="font-medium">
                {lead.customer.phone ? formatPhoneNumber(lead.customer.phone) : "-"}
              </p>
              <p className="text-muted-foreground">{lead.customer.email || "-"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Address</p>
              <p className="font-medium">
                {addressParts.length > 0 ? addressParts.join(", ") : "-"}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Lead Source</p>
              <p className="font-medium">{lead.customer.sourceType.replace("_", " ")}</p>
            </div>
            {lead.status === "WON" && lead.jobStatus && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Job Status</p>
                <Badge
                  variant={
                    lead.jobStatus === "DONE"
                      ? "default"
                      : lead.jobStatus === "IN_PROGRESS"
                      ? "secondary"
                      : "outline"
                  }
                  className={
                    lead.jobStatus === "DONE"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : lead.jobStatus === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : ""
                  }
                >
                  {lead.jobStatus.replace("_", " ")}
                </Badge>
              </div>
            )}
            {lead.lossReason && (
              <div className="space-y-1 md:col-span-3">
                <p className="text-xs text-muted-foreground">Loss Reason</p>
                <p className="font-medium">{lead.lossReason}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href={`/leads/${lead.id}`} className="inline-flex items-center gap-2">
                View Details <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const PaginationControls = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
  }) => {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Won &amp; Lost Leads</h1>
          <p className="text-sm text-muted-foreground">View closed deals</p>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "won" | "lost")}>
        <TabsList className="grid grid-cols-2 w-full md:w-auto">
          <TabsTrigger value="won">Won Leads ({wonLeads.length})</TabsTrigger>
          <TabsTrigger value="lost">Lost Leads ({lostLeads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="won" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <Select value={sortWon} onChange={(e) => setSortWon(e.target.value)}>
              <option value="date_desc">Sort: Date (newest)</option>
              <option value="date_asc">Sort: Date (oldest)</option>
              <option value="value_desc">Sort: Value (high)</option>
              <option value="value_asc">Sort: Value (low)</option>
              <option value="days_desc">Sort: Days to Close (high)</option>
              <option value="days_asc">Sort: Days to Close (low)</option>
            </Select>
            {loadingLeads && <p className="text-sm text-muted-foreground">Loading leads...</p>}
          </div>
          {paginatedWon.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                {loadingLeads ? "Loading leads..." : "No won leads found."}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedWon.map((lead) => renderLeadCard(lead))}
              </div>
              <PaginationControls
                currentPage={currentPageWon}
                totalPages={totalPagesWon}
                onPageChange={setCurrentPageWon}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="lost" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <Select value={sortLost} onChange={(e) => setSortLost(e.target.value)}>
              <option value="date_desc">Sort: Date (newest)</option>
              <option value="date_asc">Sort: Date (oldest)</option>
              <option value="value_desc">Sort: Value (high)</option>
              <option value="value_asc">Sort: Value (low)</option>
            </Select>
            {loadingLeads && <p className="text-sm text-muted-foreground">Loading leads...</p>}
          </div>
          {paginatedLost.length === 0 ? (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                {loadingLeads ? "Loading leads..." : "No lost leads found."}
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedLost.map((lead) => renderLeadCard(lead))}
              </div>
              <PaginationControls
                currentPage={currentPageLost}
                totalPages={totalPagesLost}
                onPageChange={setCurrentPageLost}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
