import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppointmentStatus } from "@prisma/client"
import { logInfo, logError, logAction } from "@/lib/utils"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      leadId,
      salesRepId,
      scheduledFor,
      siteAddressLine1,
      siteAddressLine2,
      city,
      state,
      zip,
      notes,
    } = body

    // Validate required fields
    if (!leadId || !salesRepId || !scheduledFor) {
      return NextResponse.json(
        { error: "Missing required fields: leadId, salesRepId, scheduledFor" },
        { status: 400 }
      )
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Verify sales rep exists
    const salesRep = await prisma.user.findUnique({
      where: { id: salesRepId },
    })

    if (!salesRep || salesRep.role !== "SALES_REP") {
      return NextResponse.json(
        { error: "Invalid sales rep" },
        { status: 400 }
      )
    }

    // Check permissions: SALES_REP can only create appointments for their assigned leads
    if (
      session.user.role === "SALES_REP" &&
      lead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only create appointments for your assigned leads" },
        { status: 403 }
      )
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        leadId,
        salesRepId,
        scheduledFor: new Date(scheduledFor),
        siteAddressLine1: siteAddressLine1 || null,
        siteAddressLine2: siteAddressLine2 || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        status: "SCHEDULED",
        notes: notes || null,
      },
      include: {
        lead: {
          include: {
            customer: true,
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
    })

    // Update lead status to APPOINTMENT_SET if it's not already
    if (lead.status !== "APPOINTMENT_SET") {
      await prisma.lead.update({
        where: { id: leadId },
        data: { status: "APPOINTMENT_SET" },
      })
    }

    logAction("Appointment created", session.user.id, session.user.role, {
      appointmentId: appointment.id,
      leadId: leadId,
      scheduledFor: scheduledFor,
      salesRepId: salesRepId,
    });

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error: any) {
    const session = await getServerSession(authOptions);
    logError("Error creating appointment", error, {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      leadId,
    })
    return NextResponse.json(
      { error: error.message || "Failed to create appointment" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const upcoming = searchParams.get("upcoming") === "true"
    const leadId = searchParams.get("leadId")
    const myAppointments = searchParams.get("myAppointments") === "true" || false

    const where: any = {}

    // Filter by leadId if provided
    if (leadId) {
      where.leadId = leadId
    }

    // Filter by status if provided
    if (status) {
      where.status = status as AppointmentStatus
    }

    // Filter by sales rep if user is SALES_REP and myAppointments is true
    if (myAppointments && session.user.role === "SALES_REP") {
      where.salesRepId = session.user.id
    }

    // ADMIN can see all appointments, SALES_REP can see all appointments (with limited data)
    // No filtering needed for sales reps when viewing all appointments

    // Filter upcoming appointments (scheduledFor >= now)
    if (upcoming) {
      where.scheduledFor = {
        gte: new Date(),
      }
    }

    const includeObj: any = {
      lead: {
        include: {
          customer: true, // Always include full customer, we'll filter in response
          assignedSalesRep: {
            select: {
              id: true,
              name: true,
              email: true,
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
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: includeObj,
      orderBy: {
        scheduledFor: "asc",
      },
    })

    // For sales reps viewing all appointments (not just their own), strip out sensitive data
    if (session.user.role === "SALES_REP" && !myAppointments) {
      const limitedAppointments = appointments.map((appointment) => {
        // Type assertion: lead is always included as a single object (not an array)
        // Prisma's include returns lead as a single relation object
        const appointmentWithLead = appointment as typeof appointment & {
          lead: {
            id: string;
            customer: {
              id: string;
              firstName: string;
              lastName: string;
            };
            assignedSalesRep: {
              id: string;
              name: string | null;
              email: string;
            } | null;
          };
        };
        const lead = appointmentWithLead.lead;
        const customer = lead.customer;
        return {
          id: appointment.id,
          scheduledFor: appointment.scheduledFor,
          status: appointment.status,
          lead: {
            id: lead.id,
            customer: {
              id: customer.id,
              firstName: customer.firstName,
              lastName: customer.lastName,
            },
            assignedSalesRep: lead.assignedSalesRep,
          },
          salesRep: appointment.salesRep,
          _readOnly: true,
        };
      });
      return NextResponse.json({ appointments: limitedAppointments }, { status: 200 });
    }

    return NextResponse.json({ appointments }, { status: 200 })
  } catch (error: any) {
    const session = await getServerSession(authOptions);
    logError("Error fetching appointments", error, {
      userId: session?.user?.id,
      userRole: session?.user?.role,
    })
    return NextResponse.json(
      { error: error.message || "Failed to fetch appointments" },
      { status: 500 }
    )
  }
}

