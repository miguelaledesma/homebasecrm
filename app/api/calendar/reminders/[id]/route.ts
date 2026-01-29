import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, NotificationType } from "@prisma/client"
import { logError, logAction } from "@/lib/utils"

// PATCH /api/calendar/reminders/[id] - Update calendar reminder
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update calendar reminders
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, scheduledFor, assignedUserId } = body

    // Check if reminder exists
    const existingReminder = await prisma.calendarReminder.findUnique({
      where: { id: params.id },
      include: {
        notifications: true,
      },
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      )
    }

    // If assignedUserId is provided, verify the user exists
    if (assignedUserId !== undefined && assignedUserId !== null) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedUserId },
      })
      if (!assignedUser) {
        return NextResponse.json(
          { error: "Assigned user not found" },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (title !== undefined) {
      updateData.title = title
    }
    if (description !== undefined) {
      updateData.description = description || null
    }
    if (scheduledFor !== undefined) {
      updateData.scheduledFor = new Date(scheduledFor)
    }
    if (assignedUserId !== undefined) {
      updateData.assignedUserId = assignedUserId || null
    }

    const reminder = await prisma.calendarReminder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Handle notification creation/update for assigned user
    if (assignedUserId && assignedUserId !== session.user.id) {
      // Check if notification already exists
      const existingNotification = await prisma.notification.findFirst({
        where: {
          calendarReminderId: reminder.id,
          userId: assignedUserId,
        },
      })

      if (!existingNotification) {
        // Create new notification
        try {
          await prisma.notification.create({
            data: {
              userId: assignedUserId,
              type: NotificationType.CALENDAR_TASK,
              calendarReminderId: reminder.id,
            },
          })
        } catch (notificationError: any) {
          logError("Error creating calendar task notification", notificationError, {
            reminderId: reminder.id,
            assignedUserId,
          })
        }
      }
    } else if (assignedUserId === null && existingReminder.assignedUserId) {
      // If assignment was removed, delete the notification
      try {
        await prisma.notification.deleteMany({
          where: {
            calendarReminderId: reminder.id,
            type: NotificationType.CALENDAR_TASK,
          },
        })
      } catch (notificationError: any) {
        logError("Error deleting calendar task notification", notificationError, {
          reminderId: reminder.id,
        })
      }
    }

    logAction(
      "Calendar reminder updated",
      session.user.id,
      session.user.role,
      {
        reminderId: params.id,
        changes: updateData,
      },
      session.user.name || session.user.email
    )

    return NextResponse.json({ reminder }, { status: 200 })
  } catch (error: any) {
    logError("Error updating calendar reminder", error, {
      reminderId: params.id,
      userId: (await getServerSession(authOptions))?.user?.id,
    })
    return NextResponse.json(
      { error: error.message || "Failed to update reminder" },
      { status: 500 }
    )
  }
}

// DELETE /api/calendar/reminders/[id] - Delete calendar reminder
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete calendar reminders
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if reminder exists
    const existingReminder = await prisma.calendarReminder.findUnique({
      where: { id: params.id },
    })

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      )
    }

    await prisma.calendarReminder.delete({
      where: { id: params.id },
    })

    logAction(
      "Calendar reminder deleted",
      session.user.id,
      session.user.role,
      {
        reminderId: params.id,
        title: existingReminder.title,
      },
      session.user.name || session.user.email
    )

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    logError("Error deleting calendar reminder", error, {
      reminderId: params.id,
      userId: (await getServerSession(authOptions))?.user?.id,
    })
    return NextResponse.json(
      { error: error.message || "Failed to delete reminder" },
      { status: 500 }
    )
  }
}
