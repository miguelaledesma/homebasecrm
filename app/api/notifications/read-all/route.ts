import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/notifications/read-all - Mark all user notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json(
      { count: result.count, message: "All notifications marked as read" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json(
      { error: error.message || "Failed to mark all notifications as read" },
      { status: 500 }
    )
  }
}

