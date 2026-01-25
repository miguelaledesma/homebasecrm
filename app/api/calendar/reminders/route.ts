import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
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
    const { title, description, scheduledFor } = body

    // Validate required fields
    if (!title || !scheduledFor) {
      return NextResponse.json(
        { error: "Missing required fields: title, scheduledFor" },
        { status: 400 }
      )
    }

    const reminder = await prisma.calendarReminder.create({
      data: {
        title,
        description: description || null,
        scheduledFor: new Date(scheduledFor),
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

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
