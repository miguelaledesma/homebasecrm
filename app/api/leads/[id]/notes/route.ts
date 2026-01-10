import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getLastActivityTimestamp } from "@/lib/lead-activity"

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

    // Check access: ADMIN can see all, SALES_REP and CONCIERGE only their assigned leads
    if (
      (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE") &&
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

    // Check access: ADMIN can see all, SALES_REP and CONCIERGE only their assigned leads
    if (
      (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE") &&
      lead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // If admin is commenting, check lead activity BEFORE creating the note
    // (so the admin's comment doesn't count as "activity" for this check)
    let shouldNotify = false
    if (session.user.role === "ADMIN" && lead.assignedSalesRepId) {
      try {
        // Check if lead has activity within last 48 hours (BEFORE this comment)
        const lastActivity = await getLastActivityTimestamp(leadId)
        
        if (lastActivity) {
          const hoursSinceActivity =
            (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
          
          // Only notify if lead was already active (within 48 hours) before this comment
          shouldNotify = hoursSinceActivity <= 48
        }
        // If no activity found or inactive (>48 hours), don't notify
      } catch (notificationError) {
        // Log error but continue with note creation
        console.error("Error checking lead activity for notification:", notificationError)
      }
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

    // Create notification only if lead was active within 48 hours (before this comment)
    // This prevents notifications on stale/old leads
    if (shouldNotify) {
      try {
        await prisma.notification.create({
          data: {
            userId: lead.assignedSalesRepId!,
            type: "ADMIN_COMMENT",
            leadId: leadId,
            noteId: note.id,
          },
        })
      } catch (notificationError) {
        // Log error but don't fail the note creation
        console.error("Error creating admin comment notification:", notificationError)
      }
    }

    return NextResponse.json({ note }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating lead note:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create note" },
      { status: 500 }
    )
  }
}

