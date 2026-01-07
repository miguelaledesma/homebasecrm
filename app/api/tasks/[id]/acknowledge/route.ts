import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/tasks/[id]/acknowledge - Acknowledge task
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const task = await prisma.task.findUnique({
      where: { id: params.id },
      include: { notification: true },
    })

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Verify user owns this task (or is admin)
    if (task.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Acknowledge = done. Delete notification and delete task.
    // No need to keep resolved tasks - once acknowledged, they're done.
    
    // If there's a linked notification, delete it first
    if (task.notification) {
      await prisma.notification.delete({
        where: { id: task.notification.id },
      })
    }

    // Delete the task - acknowledge = done, no need to keep it
    await prisma.task.delete({
      where: { id: params.id },
    })

    return NextResponse.json(
      { message: "Task acknowledged and deleted" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error acknowledging task:", error)
    return NextResponse.json(
      { error: error.message || "Failed to acknowledge task" },
      { status: 500 }
    )
  }
}

