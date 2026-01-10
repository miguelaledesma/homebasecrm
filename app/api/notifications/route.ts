import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/notifications - Fetch notifications for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unreadOnly") === "true"
    const unacknowledgedOnly = searchParams.get("unacknowledgedOnly") === "true"
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = {
      userId: session.user.id,
    }

    if (unreadOnly) {
      where.read = false
    }

    if (unacknowledgedOnly) {
      where.acknowledged = false
    }

    const notifications = await prisma.notification.findMany({
      where,
      include: {
        lead: {
          include: {
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        note: {
          include: {
            createdByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { acknowledged: "asc" }, // Unacknowledged first
        { read: "asc" }, // Unread first
        { createdAt: "desc" }, // Most recent first
      ],
      take: limit,
      skip: offset,
    })

    // Acknowledged notifications are automatically deleted, so all returned notifications are unacknowledged
    // No need to filter - if it exists, it's unacknowledged

    // Get total count for pagination
    const total = await prisma.notification.count({ where })

    // Get unread and unacknowledged counts
    // Note: Since acknowledged notifications are deleted, unacknowledgedCount === total
    const unreadCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        read: false,
      },
    })

    const unacknowledgedCount = await prisma.notification.count({
      where: {
        userId: session.user.id,
        acknowledged: false,
      },
    })

    return NextResponse.json(
      {
        notifications,
        pagination: {
          total: notifications.length,
          limit,
          offset,
        },
        counts: {
          unread: unreadCount,
          unacknowledged: unacknowledgedCount,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    )
  }
}

