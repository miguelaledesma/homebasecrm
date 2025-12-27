import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppointmentStatus } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
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

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      )
    }

    // SALES_REP can view any appointment, but with limited data if not their own
    if (
      session.user.role === "SALES_REP" &&
      appointment.salesRepId !== session.user.id
    ) {
      // Return limited appointment data for read-only viewing
      const limitedAppointment = {
        id: appointment.id,
        salesRepId: appointment.salesRepId,
        scheduledFor: appointment.scheduledFor,
        status: appointment.status,
        lead: {
          id: appointment.lead.id,
          customer: {
            id: appointment.lead.customer.id,
            firstName: appointment.lead.customer.firstName,
            lastName: appointment.lead.customer.lastName,
          },
        },
        salesRep: appointment.salesRep,
        // Mark as read-only for frontend
        _readOnly: true,
      }
      return NextResponse.json({ appointment: limitedAppointment }, { status: 200 })
    }

    return NextResponse.json({ appointment }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching appointment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch appointment" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      status,
      notes,
      scheduledFor,
      siteAddressLine1,
      siteAddressLine2,
      city,
      state,
      zip,
    } = body

    // Check if appointment exists and user has permission
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: params.id },
    })

    if (!existingAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      )
    }

    // SALES_REP can only update their own appointments
    if (
      session.user.role === "SALES_REP" &&
      existingAppointment.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updateData: any = {}
    if (status) {
      updateData.status = status as AppointmentStatus
    }
    if (notes !== undefined) {
      updateData.notes = notes || null
    }
    if (scheduledFor !== undefined) {
      updateData.scheduledFor = scheduledFor ? new Date(scheduledFor) : null
    }
    if (siteAddressLine1 !== undefined) {
      updateData.siteAddressLine1 = siteAddressLine1 || null
    }
    if (siteAddressLine2 !== undefined) {
      updateData.siteAddressLine2 = siteAddressLine2 || null
    }
    if (city !== undefined) {
      updateData.city = city || null
    }
    if (state !== undefined) {
      updateData.state = state || null
    }
    if (zip !== undefined) {
      updateData.zip = zip || null
    }

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json({ appointment }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating appointment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update appointment" },
      { status: 500 }
    )
  }
}

