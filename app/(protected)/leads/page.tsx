"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { LeadStatus } from "@prisma/client"

type Lead = {
  id: string
  leadType: string
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
        return "bg-green-100 text-green-800"
      case "WON":
        return "bg-emerald-100 text-emerald-800"
      case "LOST":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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
                <option value="NEW">New</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="APPOINTMENT_SET">Appointment Set</option>
                <option value="QUOTED">Quoted</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
              </Select>
            </div>
            {session?.user.role === "SALES_REP" && (
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={myLeadsOnly}
                    onChange={(e) => setMyLeadsOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm font-medium">My Leads Only</span>
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Leads List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
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
        <div className="space-y-4">
          {leads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-2">
                      <Link
                        href={`/leads/${lead.id}`}
                        className="text-base md:text-lg font-semibold hover:underline"
                      >
                        {lead.customer.firstName} {lead.customer.lastName}
                      </Link>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          lead.status
                        )}`}
                      >
                        {lead.status}
                      </span>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-secondary text-secondary-foreground">
                        {lead.leadType}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {lead.customer.phone && (
                        <div>Phone: {lead.customer.phone}</div>
                      )}
                      {lead.customer.email && (
                        <div>Email: {lead.customer.email}</div>
                      )}
                      {lead.description && (
                        <div className="mt-2">{lead.description}</div>
                      )}
                    </div>
                    {lead.assignedSalesRep && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Assigned to: {lead.assignedSalesRep.name || lead.assignedSalesRep.email}
                      </div>
                    )}
                  </div>
                  <div className="text-left sm:text-right text-sm text-muted-foreground">
                    <div>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
