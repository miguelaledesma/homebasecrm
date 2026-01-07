import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/tasks/[id]/resolve - Resolve task
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

    // Update task
    const updated = await prisma.task.update({
      where: { id: params.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
      },
    })

    // If there's a linked notification, delete it (task is resolved, notification no longer needed)
    if (task.notification) {
      await prisma.notification.delete({
        where: { id: task.notification.id },
      })
    }

    return NextResponse.json({ task: updated }, { status: 200 })
  } catch (error: any) {
    console.error("Error resolving task:", error)
    return NextResponse.json(
      { error: error.message || "Failed to resolve task" },
      { status: 500 }
    )
  }
}

