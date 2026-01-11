import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LeadStatus } from "@prisma/client"
import { logError, logInfo } from "@/lib/utils"

const DEAL_LOST_PREFIX = "Lead marked as lost. Reason:"

const extractLossReason = (content: string) => {
  const idx = content.toLowerCase().indexOf(DEAL_LOST_PREFIX.toLowerCase())
  if (idx === -1) return null
  const reason = content.substring(idx + DEAL_LOST_PREFIX.length).trim()
  return reason || null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notes = await prisma.leadNote.findMany({
      where: {
        lead: {
          status: LeadStatus.LOST,
        },
        content: {
          contains: DEAL_LOST_PREFIX,
          mode: "insensitive",
        },
      },
      select: {
        content: true,
      },
    })

    const counts: Record<string, number> = {}

    notes.forEach((note) => {
      const reason = extractLossReason(note.content || "")
      if (!reason) return
      counts[reason] = (counts[reason] || 0) + 1
    })

    const reasons = Object.entries(counts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)

    logInfo("GET /api/analytics/loss-reasons", {
      userId: session.user.id,
      totalReasons: reasons.length,
    })

    return NextResponse.json({ reasons }, { status: 200 })
  } catch (error: any) {
    logError("Error fetching loss reasons", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch loss reasons" },
      { status: 500 }
    )
  }
}
