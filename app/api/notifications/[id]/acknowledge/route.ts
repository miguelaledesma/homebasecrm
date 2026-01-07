import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/notifications/[id]/acknowledge - Acknowledge notification
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
      include: { task: true },
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

    // If there's a linked task, delete it (acknowledge = done, no need to keep it)
    if (notification.task) {
      await prisma.task.delete({
        where: { id: notification.task.id },
      })
    }

    // Delete the notification once acknowledged - it has served its purpose
    await prisma.notification.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: "Notification acknowledged and deleted" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error acknowledging notification:", error)
    return NextResponse.json(
      { error: error.message || "Failed to acknowledge notification" },
      { status: 500 }
    )
  }
}

