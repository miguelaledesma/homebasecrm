import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/leads/[id]/notes - Get all notes for a lead
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const leadId = params.id

    // Verify user has access to this lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { assignedSalesRepId: true },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Check access: ADMIN can see all, SALES_REP only their assigned leads
    if (
      session.user.role === "SALES_REP" &&
      lead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Fetch notes
    const notes = await prisma.leadNote.findMany({
      where: { leadId },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ notes }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching lead notes:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch notes" },
      { status: 500 }
    )
  }
}

// POST /api/leads/[id]/notes - Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const leadId = params.id
    const body = await request.json()
    const { content } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      )
    }

    // Verify user has access to this lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { assignedSalesRepId: true },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Check access: ADMIN can see all, SALES_REP only their assigned leads
    if (
      session.user.role === "SALES_REP" &&
      lead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Create note
    const note = await prisma.leadNote.create({
      data: {
        leadId,
        content: content.trim(),
        createdBy: session.user.id,
      },
      include: {
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating lead note:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create note" },
      { status: 500 }
    )
  }
}

