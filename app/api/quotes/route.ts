import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QuoteStatus } from "@prisma/client"
import { logInfo, logError, logAction } from "@/lib/utils"

export async function POST(request: NextRequest) {
  let leadId: string | undefined;
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { leadId: bodyLeadId, appointmentId, amount, currency, expiresAt, status } = body
    
    leadId = bodyLeadId;

    // Validate required fields
    if (!bodyLeadId || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: leadId, amount" },
        { status: 400 }
      )
    }

    // Verify lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: bodyLeadId },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Verify appointment exists if provided
    if (appointmentId) {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
      })
      if (!appointment) {
        return NextResponse.json(
          { error: "Appointment not found" },
          { status: 404 }
        )
      }
    }

    // Determine sales rep ID
    let salesRepId = lead.assignedSalesRepId
    if (!salesRepId && session.user.role === "SALES_REP") {
      salesRepId = session.user.id
    }
    if (!salesRepId) {
      return NextResponse.json(
        { error: "No sales rep assigned to this lead" },
        { status: 400 }
      )
    }

    // Check permissions: SALES_REP can only create quotes for their assigned leads
    if (
      session.user.role === "SALES_REP" &&
      lead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only create quotes for your assigned leads" },
        { status: 403 }
      )
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        leadId: bodyLeadId,
        appointmentId: appointmentId || null,
        salesRepId,
        amount: parseFloat(amount),
        currency: currency || "USD",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        status: (status as QuoteStatus) || "DRAFT",
      },
      include: {
        lead: {
          include: {
            customer: true,
          },
        },
        appointment: true,
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: true,
      },
    })

    // Update lead status to QUOTED if not already
    if (lead.status !== "QUOTED" && lead.status !== "WON" && lead.status !== "LOST") {
      await prisma.lead.update({
        where: { id: bodyLeadId },
        data: { status: "QUOTED" },
      })
    }

    logAction("Quote created", session.user.id, session.user.role, {
      quoteId: quote.id,
      leadId: bodyLeadId,
      amount: quote.amount,
      currency: quote.currency,
      status: quote.status,
    });

    return NextResponse.json({ quote }, { status: 201 })
  } catch (error: any) {
    const session = await getServerSession(authOptions);
    logError("Error creating quote", error, {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      leadId,
    })
    return NextResponse.json(
      { error: error.message || "Failed to create quote" },
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
    const leadId = searchParams.get("leadId")
    const status = searchParams.get("status")

    const where: any = {}

    // Filter by leadId if provided
    if (leadId) {
      where.leadId = leadId
    }

    // Filter by status if provided
    if (status) {
      where.status = status as QuoteStatus
    }

    // Filter by sales rep: SALES_REP only sees their quotes
    if (session.user.role === "SALES_REP") {
      where.salesRepId = session.user.id
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        lead: {
          include: {
            customer: true,
          },
        },
        appointment: true,
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ quotes }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching quotes:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotes" },
      { status: 500 }
    )
  }
}

