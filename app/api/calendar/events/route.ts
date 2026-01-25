import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeadStatus } from "@prisma/client"
import { logError } from "@/lib/utils"

// GET /api/calendar/events - Fetch all calendar events (appointments, jobs, reminders)
// Returns unified event format for FullCalendar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access calendar events
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    // Default to current month if no dates provided
    const now = new Date()
    const start = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1)
    const end = endDate ? new Date(endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    // Fetch appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledFor: {
          gte: start,
          lte: end,
        },
      },
      include: {
        lead: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
    })

    // Fetch job start dates (WON leads with jobScheduledDate)
    const jobs = await prisma.lead.findMany({
      where: {
        status: LeadStatus.WON,
        jobScheduledDate: {
          not: null,
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        jobScheduledDate: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        leadTypes: true,
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        jobScheduledDate: "asc",
      },
    })

    // Fetch calendar reminders
    const reminders = await prisma.calendarReminder.findMany({
      where: {
        scheduledFor: {
          gte: start,
          lte: end,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        scheduledFor: "asc",
      },
    })

    // Transform to FullCalendar event format
    const events = []

    // Transform appointments
    for (const appointment of appointments) {
      const customerName = `${appointment.lead.customer.firstName} ${appointment.lead.customer.lastName}`
      const salesRepName = appointment.salesRep?.name || appointment.salesRep?.email || "Unassigned"
      
      events.push({
        id: `appointment-${appointment.id}`,
        title: `Appointment: ${customerName}`,
        start: appointment.scheduledFor.toISOString(),
        backgroundColor: "#3b82f6", // Blue
        borderColor: "#2563eb",
        extendedProps: {
          type: "appointment",
          originalId: appointment.id,
          leadId: appointment.lead.id,
          customerName,
          salesRepName,
          status: appointment.status,
          address: appointment.siteAddressLine1
            ? `${appointment.siteAddressLine1}${appointment.city ? `, ${appointment.city}` : ""}`
            : null,
          notes: appointment.notes,
        },
      })
    }

    // Transform job start dates
    for (const job of jobs) {
      if (!job.jobScheduledDate) continue
      
      const customerName = `${job.customer.firstName} ${job.customer.lastName}`
      const leadTypes = job.leadTypes.join(", ")
      
      events.push({
        id: `job-${job.id}`,
        title: `Job Start: ${customerName}`,
        start: job.jobScheduledDate.toISOString(),
        backgroundColor: "#10b981", // Green
        borderColor: "#059669",
        extendedProps: {
          type: "job",
          originalId: job.id,
          leadId: job.id,
          customerName,
          leadTypes,
          salesRepName: job.assignedSalesRep?.name || job.assignedSalesRep?.email || "Unassigned",
        },
      })
    }

    // Transform reminders
    for (const reminder of reminders) {
      events.push({
        id: `reminder-${reminder.id}`,
        title: reminder.title,
        start: reminder.scheduledFor.toISOString(),
        backgroundColor: "#f97316", // Orange
        borderColor: "#ea580c",
        extendedProps: {
          type: "reminder",
          originalId: reminder.id,
          description: reminder.description,
          createdBy: reminder.user.name || reminder.user.email,
        },
      })
    }

    return NextResponse.json({ events }, { status: 200 })
  } catch (error: any) {
    logError("Error fetching calendar events", error, {
      userId: (await getServerSession(authOptions))?.user?.id,
    })
    return NextResponse.json(
      { error: error.message || "Failed to fetch calendar events" },
      { status: 500 }
    )
  }
}
