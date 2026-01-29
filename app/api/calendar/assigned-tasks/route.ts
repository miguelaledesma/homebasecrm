import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { logError } from "@/lib/utils"

// GET /api/calendar/assigned-tasks - Fetch calendar tasks assigned to current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const upcomingOnly = searchParams.get("upcomingOnly") === "true"
    const limit = parseInt(searchParams.get("limit") || "10")

    const where: any = {
      assignedUserId: session.user.id,
    }

    // Filter for upcoming tasks only if requested
    if (upcomingOnly) {
      where.scheduledFor = {
        gte: new Date(),
      }
    }

    const tasks = await prisma.calendarReminder.findMany({
      where,
      include: {
        user: {
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
      take: limit,
    })

    return NextResponse.json({ tasks }, { status: 200 })
  } catch (error: any) {
    logError("Error fetching assigned calendar tasks", error, {
      userId: (await getServerSession(authOptions))?.user?.id,
    })
    return NextResponse.json(
      { error: error.message || "Failed to fetch assigned tasks" },
      { status: 500 }
    )
  }
}
