import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/notifications/[id]/read - Mark notification as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notification = await prisma.notification.findUnique({
      where: { id: params.id },
    })

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      )
    }

    // Verify user owns this notification
    if (notification.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updated = await prisma.notification.update({
      where: { id: params.id },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ notification: updated }, { status: 200 })
  } catch (error: any) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json(
      { error: error.message || "Failed to mark notification as read" },
      { status: 500 }
    )
  }
}

