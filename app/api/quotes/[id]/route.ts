import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QuoteStatus } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
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
          orderBy: {
            uploadedAt: "desc",
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Check permissions: SALES_REP can only see their quotes
    if (
      session.user.role === "SALES_REP" &&
      quote.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ quote }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch quote" },
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
    const { status, amount, expiresAt, sentAt } = body

    // Check if quote exists and user has permission
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // SALES_REP can only update their own quotes
    if (
      session.user.role === "SALES_REP" &&
      existingQuote.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updateData: any = {}
    if (status) {
      updateData.status = status as QuoteStatus
    }
    if (amount !== undefined) {
      updateData.amount = parseFloat(amount)
    }
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    }
    if (sentAt !== undefined) {
      updateData.sentAt = sentAt ? new Date(sentAt) : null
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: updateData,
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
    })

    return NextResponse.json({ quote }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating quote:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update quote" },
      { status: 500 }
    )
  }
}

