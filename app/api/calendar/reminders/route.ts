import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, NotificationType } from "@prisma/client"
import { logError, logAction } from "@/lib/utils"

// GET /api/calendar/reminders - List reminders with optional date filtering
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access calendar reminders
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    const where: any = {}

    // Filter by date range if provided
    if (startDate || endDate) {
      where.scheduledFor = {}
      if (startDate) {
        where.scheduledFor.gte = new Date(startDate)
      }
      if (endDate) {
        where.scheduledFor.lte = new Date(endDate)
      }
    }

    const reminders = await prisma.calendarReminder.findMany({
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
    })

    return NextResponse.json({ reminders }, { status: 200 })
  } catch (error: any) {
    logError("Error fetching calendar reminders", error, {
      userId: (await getServerSession(authOptions))?.user?.id,
    })
    return NextResponse.json(
      { error: error.message || "Failed to fetch reminders" },
      { status: 500 }
    )
  }
}

// POST /api/calendar/reminders - Create calendar reminder
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create calendar reminders
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { title, description, scheduledFor, assignedUserId, color } = body

    // Validate required fields
    if (!title || !scheduledFor) {
      return NextResponse.json(
        { error: "Missing required fields: title, scheduledFor" },
        { status: 400 }
      )
    }

    // Validate color if provided (must be one of the allowed colors)
    const allowedColors = ["#ef4444", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"]
    if (color && !allowedColors.includes(color)) {
      return NextResponse.json(
        { error: "Invalid color. Must be one of the predefined colors." },
        { status: 400 }
      )
    }

    // If assignedUserId is provided, verify the user exists
    if (assignedUserId) {
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

    const reminder = await prisma.calendarReminder.create({
      data: {
        title,
        description: description || null,
        scheduledFor: new Date(scheduledFor),
        userId: session.user.id,
        assignedUserId: assignedUserId || null,
        color: color || null,
      },
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

    // If a user is assigned, create a notification for them
    if (assignedUserId && assignedUserId !== session.user.id) {
      try {
        await prisma.notification.create({
          data: {
            userId: assignedUserId,
            type: NotificationType.CALENDAR_TASK,
            calendarReminderId: reminder.id,
          },
        })
      } catch (notificationError: any) {
        // Log error but don't fail reminder creation
        logError("Error creating calendar task notification", notificationError, {
          reminderId: reminder.id,
          assignedUserId,
        })
      }
    }

    logAction(
      "Calendar reminder created",
      session.user.id,
      session.user.role,
      {
        reminderId: reminder.id,
        title: reminder.title,
        scheduledFor: reminder.scheduledFor,
      },
      session.user.name || session.user.email
    )

    return NextResponse.json({ reminder }, { status: 201 })
  } catch (error: any) {
    logError("Error creating calendar reminder", error, {
      userId: (await getServerSession(authOptions))?.user?.id,
    })
    return NextResponse.json(
      { error: error.message || "Failed to create reminder" },
      { status: 500 }
    )
  }
}
