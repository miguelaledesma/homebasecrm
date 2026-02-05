import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TaskStatus } from "@prisma/client"
import { getLastActivityTimestamp } from "@/lib/lead-activity"

// GET /api/tasks - Fetch tasks for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") as TaskStatus | null
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

    const where: any = {}

    // Admin can see all tasks, sales rep only their own
    if (session.user.role !== "ADMIN") {
      where.userId = session.user.id
    } else {
      // Admin can filter by userId if provided, otherwise show all
      const userId = searchParams.get("userId")
      if (userId && userId !== "all") {
        where.userId = userId
      }
      // If no userId or userId is "all", don't filter by userId (show all tasks)
    }

    if (status) {
      where.status = status
    }

    const tasks = await prisma.task.findMany({
      where,
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        leadId: true,
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true,
        lead: {
          select: {
            id: true,
            customerNumber: true,
            customerId: true,
            leadTypes: true,
            description: true,
            status: true,
            closedDate: true,
            jobStatus: true,
            jobScheduledDate: true,
            jobCompletedDate: true,
            assignedSalesRepId: true,
            createdBy: true,
            createdAt: true,
            updatedAt: true,
            // Exclude creditScore - column doesn't exist in database yet
            customer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            assignedSalesRep: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { status: "asc" }, // PENDING first, then ACKNOWLEDGED, then RESOLVED
        { createdAt: "desc" }, // Most recent first
      ],
      take: limit,
      skip: offset,
    })

    // Calculate hours inactive for each task's lead
    const tasksWithHours = await Promise.all(
      tasks.map(async (task) => {
        const lastActivity = await getLastActivityTimestamp(task.leadId)
        const hoursInactive = lastActivity
          ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60))
          : 0
        
        return {
          ...task,
          hoursInactive,
          lastActivity: lastActivity?.toISOString() || null,
        }
      })
    )

    // Get total count for pagination
    const total = await prisma.task.count({ where })

    // Get counts by status
    const pendingCount = await prisma.task.count({
      where: {
        ...where,
        status: "PENDING",
      },
    })

    const acknowledgedCount = await prisma.task.count({
      where: {
        ...where,
        status: "ACKNOWLEDGED",
      },
    })

    return NextResponse.json(
      {
        tasks: tasksWithHours,
        pagination: {
          total,
          limit,
          offset,
        },
        counts: {
          pending: pendingCount,
          acknowledged: acknowledgedCount,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching tasks:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch tasks" },
      { status: 500 }
    )
  }
}

