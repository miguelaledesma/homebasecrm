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
    const { leadId: bodyLeadId, appointmentId, amount, currency, expiresAt, status, quoteNumber } = body
    
    leadId = bodyLeadId;

    // Validate required fields
    if (!bodyLeadId || !amount || !quoteNumber) {
      return NextResponse.json(
        { error: "Missing required fields: leadId, amount, quoteNumber" },
        { status: 400 }
      )
    }

    // Validate quoteNumber is not empty
    if (!quoteNumber.trim()) {
      return NextResponse.json(
        { error: "Quote number cannot be empty" },
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
    if (!salesRepId && (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE")) {
      salesRepId = session.user.id
    }
    if (!salesRepId) {
      return NextResponse.json(
        { error: "No sales rep assigned to this lead" },
        { status: 400 }
      )
    }

    // Check permissions: SALES_REP and CONCIERGE can only create quotes for their assigned leads
    if (
      (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE") &&
      lead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json(
        { error: "You can only create quotes for your assigned leads" },
        { status: 403 }
      )
    }

    // Check if quoteNumber already exists
    // Using findUnique with quoteNumber since it's marked as @unique in the schema
    const existingQuote = await prisma.quote.findUnique({
      where: { 
        quoteNumber: quoteNumber.trim() 
      },
    })
    if (existingQuote) {
      return NextResponse.json(
        { error: "A quote with this number already exists" },
        { status: 400 }
      )
    }

    // Create quote
    const quote = await prisma.quote.create({
      data: {
        quoteNumber: quoteNumber.trim(),
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
      quoteNumber: quote.quoteNumber,
      leadId: bodyLeadId,
      amount: quote.amount,
      currency: quote.currency,
      status: quote.status,
    }, session.user.name || session.user.email);

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
    const page = parseInt(searchParams.get("page") || "1", 10)
    const limit = parseInt(searchParams.get("limit") || "20", 10)

    // Validate pagination parameters
    const pageNum = Math.max(1, page)
    const limitNum = Math.min(Math.max(1, limit), 100) // Cap at 100 items per page
    const skip = (pageNum - 1) * limitNum

    const where: any = {}

    // Filter by leadId if provided
    if (leadId) {
      where.leadId = leadId
    }

    // Filter by status if provided
    if (status) {
      where.status = status as QuoteStatus
    }

    // Filter by sales rep: SALES_REP and CONCIERGE only see their quotes
    if (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE") {
      where.salesRepId = session.user.id
    }

    // Get total count for pagination
    const total = await prisma.quote.count({ where })

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
      skip,
      take: limitNum,
    })

    return NextResponse.json(
      {
        quotes,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching quotes:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch quotes" },
      { status: 500 }
    )
  }
}

