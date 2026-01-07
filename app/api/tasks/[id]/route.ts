import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// DELETE /api/tasks/[id] - Delete a task (only if resolved)
export async function DELETE(
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

    // Only allow deleting resolved tasks
    if (task.status !== "RESOLVED") {
      return NextResponse.json(
        { error: "Can only delete resolved tasks" },
        { status: 400 }
      )
    }

    // Delete the task (notification will be deleted via cascade if linked)
    await prisma.task.delete({
      where: { id: params.id },
    })

    // Also delete the linked notification if it exists
    if (task.notification) {
      await prisma.notification.delete({
        where: { id: task.notification.id },
      })
    }

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting task:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete task" },
      { status: 500 }
    )
  }
}

