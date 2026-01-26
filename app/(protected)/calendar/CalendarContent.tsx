"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import interactionPlugin from "@fullcalendar/interaction"
import type { EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { X, ExternalLink, Info } from "lucide-react"
import type { EventInput } from "@fullcalendar/core"

type CalendarEvent = EventInput & {
  extendedProps: {
    type: "appointment" | "job" | "reminder"
    originalId: string
    leadId?: string
    customerName?: string
    salesRepName?: string
    salesRepId?: string | null
    status?: string
    address?: string | null
    notes?: string | null
    description?: string | null
    createdBy?: string
    leadTypes?: string[]
  }
}

type Lead = {
  id: string
  customer: {
    firstName: string
    lastName: string
  }
  status: string
}

type User = {
  id: string
  name: string | null
  email: string
}

type AppointmentFormData = {
  leadId: string
  salesRepId: string
  scheduledFor: string
  siteAddressLine1: string
  siteAddressLine2: string
  city: string
  state: string
  zip: string
  notes: string
}

type ReminderFormData = {
  title: string
  description: string
  scheduledFor: string
}

export function CalendarContent() {
  const router = useRouter()
  const calendarRef = useRef<FullCalendar>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [showEventTypeModal, setShowEventTypeModal] = useState(false)
  const [showLegend, setShowLegend] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  // Form states
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormData>({
    leadId: "",
    salesRepId: "",
    scheduledFor: "",
    siteAddressLine1: "",
    siteAddressLine2: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  })
  const [reminderForm, setReminderForm] = useState<ReminderFormData>({
    title: "",
    description: "",
    scheduledFor: "",
  })
  
  // Search states
  const [leadSearchQuery, setLeadSearchQuery] = useState("")
  const [leadSearchResults, setLeadSearchResults] = useState<Lead[]>([])
  const [searchingLeads, setSearchingLeads] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Fetch users for appointment form
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const response = await fetch("/api/users")
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [])

  // Search for leads
  const searchLeads = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setLeadSearchResults([])
      return
    }

    setSearchingLeads(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      if (response.ok) {
        const data = await response.json()
        // Transform search results to leads format
        const leads: Lead[] = (data.results || []).map((result: any) => ({
          id: result.mostRecentLead?.id || "",
          customer: {
            firstName: result.firstName,
            lastName: result.lastName,
          },
          status: result.mostRecentLead?.status || "",
        })).filter((lead: Lead) => lead.id) // Filter out results without leads
        setLeadSearchResults(leads)
      }
    } catch (error) {
      console.error("Error searching leads:", error)
      setLeadSearchResults([])
    } finally {
      setSearchingLeads(false)
    }
  }, [])

  // Debounced lead search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchLeads(leadSearchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [leadSearchQuery, searchLeads])

  // Fetch calendar events
  const fetchEvents = useCallback(async (start?: Date, end?: Date) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      // If no dates provided, use current month
      if (!start || !end) {
        const now = new Date()
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        params.append("start", monthStart.toISOString())
        params.append("end", monthEnd.toISOString())
      } else {
        params.append("start", start.toISOString())
        params.append("end", end.toISOString())
      }

      const response = await fetch(`/api/calendar/events?${params.toString()}`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to fetch events")
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error("Error fetching events:", error)
      setEvents([]) // Set empty array on error so calendar still renders
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Handle date selection (create new event)
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDate(selectInfo.start)
    setShowEventTypeModal(true)
    selectInfo.view.calendar.unselect()
  }

  // Handle event type selection
  const handleSelectAppointment = () => {
    if (!selectedDate) return
    setShowEventTypeModal(false)
    setShowAppointmentModal(true)
    setEditingEvent(null)
    setAppointmentForm({
      leadId: "",
      salesRepId: "",
      scheduledFor: selectedDate.toISOString().slice(0, 16),
      siteAddressLine1: "",
      siteAddressLine2: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
    })
  }

  const handleSelectReminder = () => {
    if (!selectedDate) return
    setShowEventTypeModal(false)
    setShowReminderModal(true)
    setEditingEvent(null)
    setReminderForm({
      title: "",
      description: "",
      scheduledFor: selectedDate.toISOString().slice(0, 16),
    })
  }

  // Handle event click
  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event
    const props = event.extendedProps as CalendarEvent["extendedProps"]

    // Job start dates navigate to lead page
    if (props.type === "job" && props.leadId) {
      router.push(`/leads/${props.leadId}`)
      return
    }

    // Appointments and reminders open edit modal
    if (props.type === "appointment") {
      setEditingEvent(event as unknown as CalendarEvent)
      setShowAppointmentModal(true)
      setAppointmentForm({
        leadId: props.leadId || "",
        salesRepId: props.salesRepId || "",
        scheduledFor: new Date(event.start || new Date()).toISOString().slice(0, 16),
        siteAddressLine1: props.address?.split(",")[0] || "",
        city: props.address?.split(",")[1]?.trim() || "",
        siteAddressLine2: "",
        state: "",
        zip: "",
        notes: props.notes || "",
      })
      // Clear lead search query when editing - we'll show customer name in disabled input
      setLeadSearchQuery("")
      setLeadSearchResults([])
    } else if (props.type === "reminder") {
      setEditingEvent(event as unknown as CalendarEvent)
      setShowReminderModal(true)
      setReminderForm({
        title: event.title || "",
        description: props.description || "",
        scheduledFor: new Date(event.start || new Date()).toISOString().slice(0, 16),
      })
    }
  }

  // Handle event drop (reschedule)
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const event = dropInfo.event
    const props = event.extendedProps as CalendarEvent["extendedProps"]
    const newDate = dropInfo.event.start
    if (!newDate) return

    try {
      if (props.type === "appointment") {
        const response = await fetch(`/api/appointments/${props.originalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledFor: newDate.toISOString(),
          }),
        })
        if (!response.ok) throw new Error("Failed to update appointment")
      } else if (props.type === "reminder") {
        const response = await fetch(`/api/calendar/reminders/${props.originalId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledFor: newDate.toISOString(),
          }),
        })
        if (!response.ok) throw new Error("Failed to update reminder")
      }

      // Refetch events to ensure consistency
      const calendar = calendarRef.current?.getApi()
      if (calendar) {
        const view = calendar.view
        await fetchEvents(view.activeStart, view.activeEnd)
      }
    } catch (error) {
      console.error("Error updating event:", error)
      alert("Failed to reschedule event")
      // Revert the change
      dropInfo.revert()
    }
  }

  // Handle appointment form submit
  const handleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!appointmentForm.leadId || !appointmentForm.salesRepId || !appointmentForm.scheduledFor) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const url = editingEvent
        ? `/api/appointments/${editingEvent.extendedProps.originalId}`
        : "/api/appointments"
      const method = editingEvent ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: appointmentForm.leadId,
          salesRepId: appointmentForm.salesRepId,
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
        throw new Error(data.error || "Failed to save appointment")
      }

      // Close modal and refetch events
      setShowAppointmentModal(false)
      setEditingEvent(null)
      setAppointmentForm({
        leadId: "",
        salesRepId: "",
        scheduledFor: "",
        siteAddressLine1: "",
        siteAddressLine2: "",
        city: "",
        state: "",
        zip: "",
        notes: "",
      })
      setLeadSearchQuery("")
      setLeadSearchResults([])

      const calendar = calendarRef.current?.getApi()
      if (calendar) {
        const view = calendar.view
        await fetchEvents(view.activeStart, view.activeEnd)
      }
    } catch (error: any) {
      console.error("Error saving appointment:", error)
      alert(error.message || "Failed to save appointment")
    }
  }

  // Handle reminder form submit
  const handleReminderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!reminderForm.title || !reminderForm.scheduledFor) {
      alert("Please fill in all required fields")
      return
    }

    try {
      const url = editingEvent
        ? `/api/calendar/reminders/${editingEvent.extendedProps.originalId}`
        : "/api/calendar/reminders"
      const method = editingEvent ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reminderForm.title,
          description: reminderForm.description || null,
          scheduledFor: reminderForm.scheduledFor,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to save reminder")
      }

      // Close modal and refetch events
      setShowReminderModal(false)
      setEditingEvent(null)
      setReminderForm({
        title: "",
        description: "",
        scheduledFor: "",
      })

      const calendar = calendarRef.current?.getApi()
      if (calendar) {
        const view = calendar.view
        await fetchEvents(view.activeStart, view.activeEnd)
      }
    } catch (error: any) {
      console.error("Error saving reminder:", error)
      alert(error.message || "Failed to save reminder")
    }
  }

  // Handle delete reminder
  const handleDeleteReminder = async () => {
    if (!editingEvent || editingEvent.extendedProps.type !== "reminder") return

    if (!confirm("Are you sure you want to delete this reminder?")) return

    try {
      const response = await fetch(
        `/api/calendar/reminders/${editingEvent.extendedProps.originalId}`,
        {
          method: "DELETE",
        }
      )

      if (!response.ok) throw new Error("Failed to delete reminder")

      setShowReminderModal(false)
      setEditingEvent(null)
      setReminderForm({
        title: "",
        description: "",
        scheduledFor: "",
      })

      const calendar = calendarRef.current?.getApi()
      if (calendar) {
        const view = calendar.view
        await fetchEvents(view.activeStart, view.activeEnd)
      }
    } catch (error: any) {
      console.error("Error deleting reminder:", error)
      alert(error.message || "Failed to delete reminder")
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Legend Info Icon - Above Calendar */}
      <div className="flex justify-end">
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onMouseEnter={() => setShowLegend(true)}
            onMouseLeave={() => setShowLegend(false)}
            onClick={() => setShowLegend(!showLegend)}
          >
            <Info className="h-4 w-4" />
          </Button>
          {showLegend && (
            <div className="absolute top-10 right-0 bg-popover border border-border rounded-md shadow-lg p-4 min-w-[280px] z-30">
              <div className="space-y-3">
                <div className="font-semibold text-sm mb-2">Event Legend</div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded mt-0.5" style={{ backgroundColor: "#3b82f6" }} />
                  <div className="text-sm">
                    <div className="font-medium">Appointments</div>
                    <div className="text-muted-foreground text-xs">All scheduled appointments</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded mt-0.5" style={{ backgroundColor: "#10b981" }} />
                  <div className="text-sm">
                    <div className="font-medium">Job Start Dates</div>
                    <div className="text-muted-foreground text-xs">WON leads with scheduled start dates</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded mt-0.5" style={{ backgroundColor: "#f97316" }} />
                  <div className="text-sm">
                    <div className="font-medium">Reminders/Tasks</div>
                    <div className="text-muted-foreground text-xs">Calendar reminders</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Calendar */}
      <Card className="w-full">
        <CardContent className="p-0">
          <div className="relative min-h-[600px]">
            {loading && (
              <div className="absolute inset-0 bg-background/80 z-10 flex items-center justify-center">
                <div className="text-muted-foreground">Loading calendar...</div>
              </div>
            )}
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek",
              }}
              height="auto"
              contentHeight="auto"
              editable={true}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              weekends={true}
              events={events}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDrop={handleEventDrop}
              eventDisplay="block"
              eventTextColor="#fff"
              datesSet={(arg) => {
                fetchEvents(arg.start, arg.end)
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Type Selection Modal */}
      {showEventTypeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Create New Event</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowEventTypeModal(false)
                    setSelectedDate(null)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground mb-4">
                Select the type of event you want to create for{" "}
                {selectedDate && (
                  <span className="font-medium">
                    {new Date(selectedDate).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-start"
                  onClick={handleSelectAppointment}
                >
                  <div className="font-semibold text-left">Appointment</div>
                  <div className="text-sm text-muted-foreground text-left mt-1">
                    Schedule an appointment with a customer lead
                  </div>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 px-4 flex flex-col items-start"
                  onClick={handleSelectReminder}
                >
                  <div className="font-semibold text-left">Reminder / Task</div>
                  <div className="text-sm text-muted-foreground text-left mt-1">
                    Create a reminder or task for yourself
                  </div>
                </Button>
              </div>
              <div className="flex justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEventTypeModal(false)
                    setSelectedDate(null)
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingEvent ? "Edit Appointment" : "Create Appointment"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAppointmentModal(false)
                    setEditingEvent(null)
                    setAppointmentForm({
                      leadId: "",
                      salesRepId: "",
                      scheduledFor: "",
                      siteAddressLine1: "",
                      siteAddressLine2: "",
                      city: "",
                      state: "",
                      zip: "",
                      notes: "",
                    })
                    setLeadSearchQuery("")
                    setLeadSearchResults([])
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                {/* Lead Search */}
                <div>
                  <Label htmlFor="leadSearch">Lead *</Label>
                  {editingEvent && editingEvent.extendedProps.customerName ? (
                    <div className="flex items-center gap-2">
                      <Input
                        id="leadSearch"
                        value={editingEvent.extendedProps.customerName}
                        disabled
                        className="bg-muted"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          router.push(`/leads/${editingEvent.extendedProps.leadId}`)
                        }
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Lead
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Input
                        id="leadSearch"
                        value={leadSearchQuery}
                        onChange={(e) => setLeadSearchQuery(e.target.value)}
                        placeholder="Search for lead by customer name..."
                        required
                      />
                      {leadSearchResults.length > 0 && (
                        <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                          {leadSearchResults.map((lead) => (
                            <button
                              key={lead.id}
                              type="button"
                              onClick={() => {
                                setAppointmentForm({ ...appointmentForm, leadId: lead.id })
                                setLeadSearchQuery(
                                  `${lead.customer.firstName} ${lead.customer.lastName}`
                                )
                                setLeadSearchResults([])
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-accent transition-colors"
                            >
                              {lead.customer.firstName} {lead.customer.lastName} ({lead.status})
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Sales Rep */}
                <div>
                  <Label htmlFor="salesRepId">Sales Rep *</Label>
                  <Select
                    id="salesRepId"
                    value={appointmentForm.salesRepId}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, salesRepId: e.target.value })
                    }
                    required
                  >
                    <option value="">Select sales rep</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Date & Time */}
                <div>
                  <Label htmlFor="scheduledFor">Date & Time *</Label>
                  <Input
                    id="scheduledFor"
                    type="datetime-local"
                    value={appointmentForm.scheduledFor}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, scheduledFor: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Address */}
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
                        setAppointmentForm({ ...appointmentForm, city: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={appointmentForm.state}
                      onChange={(e) =>
                        setAppointmentForm({ ...appointmentForm, state: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      value={appointmentForm.zip}
                      onChange={(e) =>
                        setAppointmentForm({ ...appointmentForm, zip: e.target.value })
                      }
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={appointmentForm.notes}
                    onChange={(e) =>
                      setAppointmentForm({ ...appointmentForm, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAppointmentModal(false)
                      setEditingEvent(null)
                      setSelectedDate(null)
                      setAppointmentForm({
                        leadId: "",
                        salesRepId: "",
                        scheduledFor: "",
                        siteAddressLine1: "",
                        siteAddressLine2: "",
                        city: "",
                        state: "",
                        zip: "",
                        notes: "",
                      })
                      setLeadSearchQuery("")
                      setLeadSearchResults([])
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">{editingEvent ? "Update" : "Create"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingEvent ? "Edit Reminder" : "Create Reminder"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReminderModal(false)
                    setEditingEvent(null)
                    setReminderForm({
                      title: "",
                      description: "",
                      scheduledFor: "",
                    })
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReminderSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <Label htmlFor="reminderTitle">Title *</Label>
                  <Input
                    id="reminderTitle"
                    value={reminderForm.title}
                    onChange={(e) =>
                      setReminderForm({ ...reminderForm, title: e.target.value })
                    }
                    required
                    placeholder="e.g., Follow up with customer"
                  />
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="reminderDescription">Description</Label>
                  <Textarea
                    id="reminderDescription"
                    value={reminderForm.description}
                    onChange={(e) =>
                      setReminderForm({ ...reminderForm, description: e.target.value })
                    }
                    rows={3}
                    placeholder="Optional details..."
                  />
                </div>

                {/* Date & Time */}
                <div>
                  <Label htmlFor="reminderScheduledFor">Date & Time *</Label>
                  <Input
                    id="reminderScheduledFor"
                    type="datetime-local"
                    value={reminderForm.scheduledFor}
                    onChange={(e) =>
                      setReminderForm({ ...reminderForm, scheduledFor: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  {editingEvent && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleDeleteReminder}
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowReminderModal(false)
                      setEditingEvent(null)
                      setSelectedDate(null)
                      setReminderForm({
                        title: "",
                        description: "",
                        scheduledFor: "",
                      })
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">{editingEvent ? "Update" : "Create"}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
