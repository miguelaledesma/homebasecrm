import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppointmentStatus } from "@prisma/client"

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

    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating appointment:", error)
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

    const where: any = {}

    // Filter by leadId if provided
    if (leadId) {
      where.leadId = leadId
    }

    // Filter by status if provided
    if (status) {
      where.status = status as AppointmentStatus
    }

    // Filter by sales rep: SALES_REP only sees their appointments
    if (session.user.role === "SALES_REP") {
      where.salesRepId = session.user.id
    }

    // Filter upcoming appointments (scheduledFor >= now)
    if (upcoming) {
      where.scheduledFor = {
        gte: new Date(),
      }
    }

    const appointments = await prisma.appointment.findMany({
      where,
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
      orderBy: {
        scheduledFor: "asc",
      },
    })

    return NextResponse.json({ appointments }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching appointments:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch appointments" },
      { status: 500 }
    )
  }
}

