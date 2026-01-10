import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if quote exists and user has permission
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // SALES_REP and CONCIERGE can only send their quotes
    if (
      (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE") &&
      quote.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Update quote: set sentAt and status to SENT
    const updatedQuote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        sentAt: new Date(),
        status: "SENT",
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

    // For now, we just update the status
    // Later (Phase 4), this will trigger automated follow-up tasks
    // In Phase 6, we'll add actual email/SMS sending

    return NextResponse.json({ quote: updatedQuote }, { status: 200 })
  } catch (error: any) {
    console.error("Error sending quote:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send quote" },
      { status: 500 }
    )
  }
}

