import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { logError, logInfo } from "@/lib/utils"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access this endpoint
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get all leads with their createdBy field
    // Group by createdBy and count leads per user
    const leadCounts = await prisma.lead.groupBy({
      by: ["createdBy"],
      _count: {
        id: true,
      },
      where: {
        createdBy: {
          not: null,
        },
      },
    })

    // Get user details for each creator
    const userIds = leadCounts
      .map((item) => item.createdBy)
      .filter((id): id is string => id !== null)

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    // Create a map of user IDs to user details
    const userMap = new Map(users.map((user) => [user.id, user]))

    // Combine lead counts with user details
    const stats = leadCounts
      .map((item) => {
        const user = item.createdBy ? userMap.get(item.createdBy) : null
        if (!user) {
          // Handle case where user might have been deleted
          return null
        }
        return {
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          leadCount: item._count.id,
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.leadCount - a.leadCount) // Sort by lead count descending

    logInfo("GET /api/analytics/lead-creation", {
      userId: session.user.id,
      statsCount: stats.length,
    })

    return NextResponse.json(
      {
        stats,
      },
      { status: 200 }
    )
  } catch (error: any) {
    logError("Error fetching lead creation analytics", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch lead creation stats" },
      { status: 500 }
    )
  }
}
