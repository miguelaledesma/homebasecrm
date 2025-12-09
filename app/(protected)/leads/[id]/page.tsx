"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Plus, Calendar, DollarSign, FileText } from "lucide-react"
import { LeadStatus, AppointmentStatus, QuoteStatus } from "@prisma/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Lead = {
  id: string
  leadType: string
  description: string | null
  status: LeadStatus
  assignedSalesRepId: string | null
  createdAt: string
  updatedAt: string
  customer: {
    id: string
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
  assignedSalesRep: {
    id: string
    name: string | null
    email: string
  } | null
}

type User = {
  id: string
  name: string | null
  email: string
}

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
  salesRep: {
    id: string
    name: string | null
    email: string
  }
}

type Quote = {
  id: string
  amount: number
  currency: string
  status: QuoteStatus
  sentAt: string | null
  expiresAt: string | null
  createdAt: string
  appointmentId: string | null
  files: Array<{
    id: string
    fileUrl: string
    fileType: string | null
    uploadedAt: string
  }>
}

export default function LeadDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [salesReps, setSalesReps] = useState<User[]>([])
  const [status, setStatus] = useState<LeadStatus>("NEW")
  const [assignedSalesRepId, setAssignedSalesRepId] = useState<string>("")
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [creatingAppointment, setCreatingAppointment] = useState(false)
  const [appointmentForm, setAppointmentForm] = useState({
    scheduledFor: "",
    siteAddressLine1: "",
    siteAddressLine2: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  })
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [creatingQuote, setCreatingQuote] = useState(false)
  const [quoteForm, setQuoteForm] = useState({
    amount: "",
    currency: "USD",
    expiresAt: "",
    appointmentId: "",
    status: "DRAFT" as QuoteStatus,
  })

  const leadId = params.id as string

  useEffect(() => {
    if (leadId) {
      fetchLead()
      fetchAppointments()
      fetchQuotes()
    }
    if (session?.user.role === "ADMIN") {
      fetchSalesReps()
    }
  }, [leadId, session])

  const fetchLead = async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/leads")
          return
        }
        throw new Error("Failed to fetch lead")
      }
      const data = await response.json()
      setLead(data.lead)
      setStatus(data.lead.status)
      setAssignedSalesRepId(data.lead.assignedSalesRepId || "")
    } catch (error) {
      console.error("Error fetching lead:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSalesReps = async () => {
    try {
      const response = await fetch("/api/users")
      if (!response.ok) throw new Error("Failed to fetch sales reps")
      const data = await response.json()
      setSalesReps(data.users)
    } catch (error) {
      console.error("Error fetching sales reps:", error)
    }
  }

  const fetchAppointments = async () => {
    try {
      const response = await fetch(`/api/appointments?leadId=${leadId}`)
      if (!response.ok) throw new Error("Failed to fetch appointments")
      const data = await response.json()
      setAppointments(data.appointments)
    } catch (error) {
      console.error("Error fetching appointments:", error)
    }
  }

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingAppointment(true)

    try {
      // Determine sales rep ID: use assigned rep or current user if they're a sales rep
      let salesRepId = lead?.assignedSalesRepId
      if (!salesRepId && session?.user.role === "SALES_REP") {
        salesRepId = session.user.id
      }
      if (!salesRepId) {
        throw new Error("No sales rep assigned to this lead")
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          salesRepId,
          scheduledFor: appointmentForm.scheduledFor,
          siteAddressLine1: appointmentForm.siteAddressLine1 || null,
          siteAddressLine2: appointmentForm.siteAddressLine2 || null,
          city: appointmentForm.city || null,
          state: appointmentForm.state || null,
          zip: appointmentForm.zip || null,
          notes: appointmentForm.notes || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create appointment")
      }

      // Reset form and refresh
      setAppointmentForm({
        scheduledFor: "",
        siteAddressLine1: "",
        siteAddressLine2: "",
        city: "",
        state: "",
        zip: "",
        notes: "",
      })
      setShowAppointmentForm(false)
      fetchAppointments()
      fetchLead() // Refresh lead to update status
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Failed to create appointment")
    } finally {
      setCreatingAppointment(false)
    }
  }

  const fetchQuotes = async () => {
    try {
      const response = await fetch(`/api/quotes?leadId=${leadId}`)
      if (!response.ok) throw new Error("Failed to fetch quotes")
      const data = await response.json()
      setQuotes(data.quotes)
    } catch (error) {
      console.error("Error fetching quotes:", error)
    }
  }

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingQuote(true)

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          appointmentId: quoteForm.appointmentId || null,
          amount: quoteForm.amount,
          currency: quoteForm.currency,
          expiresAt: quoteForm.expiresAt || null,
          status: quoteForm.status,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to create quote")
      }

      // Reset form and refresh
      setQuoteForm({
        amount: "",
        currency: "USD",
        expiresAt: "",
        appointmentId: "",
        status: "DRAFT",
      })
      setShowQuoteForm(false)
      fetchQuotes()
      fetchLead() // Refresh lead to update status
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Failed to create quote")
    } finally {
      setCreatingQuote(false)
    }
  }

  const canCreateAppointment =
    (session?.user.role === "ADMIN" ||
      (session?.user.role === "SALES_REP" &&
        lead?.assignedSalesRepId === session.user.id)) &&
    lead?.assignedSalesRepId

  const canCreateQuote =
    (session?.user.role === "ADMIN" ||
      (session?.user.role === "SALES_REP" &&
        lead?.assignedSalesRepId === session.user.id)) &&
    lead?.assignedSalesRepId

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assignedSalesRepId: assignedSalesRepId || null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update lead")
      }

      const data = await response.json()
      setLead(data.lead)
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Failed to update lead")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!lead) {
    return <div className="text-center py-8">Lead not found</div>
  }

  const hasChanges =
    status !== lead.status ||
    assignedSalesRepId !== (lead.assignedSalesRepId || "")

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Lead Details</h1>
          <p className="text-muted-foreground">
            {lead.customer.firstName} {lead.customer.lastName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg">
                {lead.customer.firstName} {lead.customer.lastName}
              </p>
            </div>
            {lead.customer.phone && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Phone</p>
                <p>{lead.customer.phone}</p>
              </div>
            )}
            {lead.customer.email && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{lead.customer.email}</p>
              </div>
            )}
            {(lead.customer.addressLine1 ||
              lead.customer.city ||
              lead.customer.state) && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p>
                  {lead.customer.addressLine1}
                  {lead.customer.addressLine2 && (
                    <>, {lead.customer.addressLine2}</>
                  )}
                  <br />
                  {lead.customer.city && <>{lead.customer.city}, </>}
                  {lead.customer.state} {lead.customer.zip}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-muted-foreground">Source</p>
              <p>{lead.customer.sourceType.replace("_", " ")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Lead Information */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadStatus)}
              >
                <option value="NEW">New</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="APPOINTMENT_SET">Appointment Set</option>
                <option value="QUOTED">Quoted</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
              </Select>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground">Lead Type</p>
              <p className="mt-1">{lead.leadType}</p>
            </div>

            {session?.user.role === "ADMIN" && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Assigned Sales Rep
                </p>
                <Select
                  value={assignedSalesRepId}
                  onChange={(e) => setAssignedSalesRepId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {salesReps.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name || rep.email}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {lead.assignedSalesRep && session?.user.role !== "ADMIN" && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assigned To
                </p>
                <p>{lead.assignedSalesRep.name || lead.assignedSalesRep.email}</p>
              </div>
            )}

            {lead.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Description</p>
                <p className="mt-1 whitespace-pre-wrap">{lead.description}</p>
              </div>
            )}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="text-sm">
                    {new Date(lead.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Updated</p>
                  <p className="text-sm">
                    {new Date(lead.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Appointments</CardTitle>
              <CardDescription>
                Schedule and manage appointments for this lead
              </CardDescription>
            </div>
            {canCreateAppointment && (
              <Button
                onClick={() => setShowAppointmentForm(!showAppointmentForm)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Appointment Form */}
          {showAppointmentForm && canCreateAppointment && (
            <form onSubmit={handleCreateAppointment} className="space-y-4 p-4 border rounded-md bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="scheduledFor">Date & Time *</Label>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={appointmentForm.scheduledFor}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        scheduledFor: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="siteAddressLine1">Site Address Line 1</Label>
                <Input
                  id="siteAddressLine1"
                  value={appointmentForm.siteAddressLine1}
                  onChange={(e) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      siteAddressLine1: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label htmlFor="siteAddressLine2">Site Address Line 2</Label>
                <Input
                  id="siteAddressLine2"
                  value={appointmentForm.siteAddressLine2}
                  onChange={(e) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      siteAddressLine2: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={appointmentForm.city}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        city: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={appointmentForm.state}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        state: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={appointmentForm.zip}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        zip: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={appointmentForm.notes}
                  onChange={(e) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creatingAppointment}>
                  {creatingAppointment ? "Creating..." : "Create Appointment"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAppointmentForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Appointments List */}
          {appointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No appointments scheduled yet.
              {canCreateAppointment && " Create one to get started."}
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="p-4 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">
                          {new Date(appointment.scheduledFor).toLocaleString()}
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            appointment.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : appointment.status === "CANCELLED"
                              ? "bg-red-100 text-red-800"
                              : appointment.status === "NO_SHOW"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      {(appointment.siteAddressLine1 ||
                        appointment.city) && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {appointment.siteAddressLine1}
                          {appointment.siteAddressLine2 && (
                            <>, {appointment.siteAddressLine2}</>
                          )}
                          {appointment.city && (
                            <>
                              <br />
                              {appointment.city}
                              {appointment.state && <>, {appointment.state}</>}{" "}
                              {appointment.zip}
                            </>
                          )}
                        </div>
                      )}
                      {appointment.notes && (
                        <div className="text-sm text-muted-foreground">
                          {appointment.notes}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-2">
                        Sales Rep: {appointment.salesRep.name || appointment.salesRep.email}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotes Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Quotes</CardTitle>
              <CardDescription>
                Create and manage quotes for this lead
              </CardDescription>
            </div>
            {canCreateQuote && (
              <Button
                onClick={() => setShowQuoteForm(!showQuoteForm)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Quote
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New Quote Form */}
          {showQuoteForm && canCreateQuote && (
            <form onSubmit={handleCreateQuote} className="space-y-4 p-4 border rounded-md bg-muted/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={quoteForm.amount}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        amount: e.target.value,
                      })
                    }
                    required
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    id="currency"
                    value={quoteForm.currency}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        currency: e.target.value,
                      })
                    }
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expiresAt">Expires At</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={quoteForm.expiresAt}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        expiresAt: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="appointmentId">Related Appointment</Label>
                  <Select
                    id="appointmentId"
                    value={quoteForm.appointmentId}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        appointmentId: e.target.value,
                      })
                    }
                  >
                    <option value="">None</option>
                    {appointments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {new Date(apt.scheduledFor).toLocaleString()}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  id="status"
                  value={quoteForm.status}
                  onChange={(e) =>
                    setQuoteForm({
                      ...quoteForm,
                      status: e.target.value as QuoteStatus,
                    })
                  }
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creatingQuote}>
                  {creatingQuote ? "Creating..." : "Create Quote"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowQuoteForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {/* Quotes List */}
          {quotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No quotes created yet.
              {canCreateQuote && " Create one to get started."}
            </div>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <Link
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  className="block"
                >
                  <div className="p-4 border rounded-md hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold text-lg">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: quote.currency,
                            }).format(quote.amount)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              quote.status === "ACCEPTED"
                                ? "bg-green-100 text-green-800"
                                : quote.status === "DECLINED"
                                ? "bg-red-100 text-red-800"
                                : quote.status === "EXPIRED"
                                ? "bg-orange-100 text-orange-800"
                                : quote.status === "SENT"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {quote.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            Created: {new Date(quote.createdAt).toLocaleString()}
                          </div>
                          {quote.sentAt && (
                            <div>
                              Sent: {new Date(quote.sentAt).toLocaleString()}
                            </div>
                          )}
                          {quote.expiresAt && (
                            <div>
                              Expires: {new Date(quote.expiresAt).toLocaleString()}
                            </div>
                          )}
                          {quote.files.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <FileText className="h-4 w-4" />
                              <span>{quote.files.length} file(s)</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

