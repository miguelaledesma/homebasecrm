import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getLastActivityTimestamp } from "@/lib/lead-activity"
import { TaskStatus } from "@prisma/client"

// GET /api/admin/follow-ups - Fetch all inactive leads grouped by sales rep (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access this endpoint
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const salesRepId = searchParams.get("salesRepId")
    const hoursMin = parseFloat(searchParams.get("hoursMin") || "48")
    const hoursMax = searchParams.get("hoursMax")
      ? parseFloat(searchParams.get("hoursMax")!)
      : null
    const taskStatus = searchParams.get("taskStatus") as TaskStatus | null

    // Query all leads with assigned sales rep and not in terminal states
    const where: any = {
      assignedSalesRepId: { not: null },
      status: { notIn: ["WON", "LOST"] },
    }

    if (salesRepId) {
      where.assignedSalesRepId = salesRepId
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        assignedSalesRepId: true,
        creditScore: true,
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        tasks: {
          where: {
            type: "LEAD_INACTIVITY",
            ...(taskStatus ? { status: taskStatus } : {}),
          },
        },
      },
    })

    // Calculate inactivity for each lead and filter
    const inactiveLeads = []
    const salesRepStats: Record<
      string,
      {
        id: string
        name: string | null
        email: string
        inactiveCount: number
        totalHoursInactive: number
        unacknowledgedTasks: number
      }
    > = {}

    for (const lead of leads) {
      if (!lead.assignedSalesRepId || !lead.assignedSalesRep) continue

      const lastActivity = await getLastActivityTimestamp(lead.id)
      if (!lastActivity) continue

      const hoursInactive =
        (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)

      // Filter by hours range
      if (hoursInactive < hoursMin) continue
      if (hoursMax && hoursInactive > hoursMax) continue

      // Filter by task status if provided
      if (taskStatus) {
        const hasTaskWithStatus = lead.tasks.some(
          (t) => t.status === taskStatus
        )
        if (!hasTaskWithStatus) continue
      }

      const salesRepId = lead.assignedSalesRepId
      if (!salesRepStats[salesRepId]) {
        salesRepStats[salesRepId] = {
          id: salesRepId,
          name: lead.assignedSalesRep.name,
          email: lead.assignedSalesRep.email,
          inactiveCount: 0,
          totalHoursInactive: 0,
          unacknowledgedTasks: 0,
        }
      }

      salesRepStats[salesRepId].inactiveCount++
      salesRepStats[salesRepId].totalHoursInactive += hoursInactive

      const unacknowledgedTask = lead.tasks.find(
        (t) => t.status === "PENDING"
      )
      if (unacknowledgedTask) {
        salesRepStats[salesRepId].unacknowledgedTasks++
      }

      inactiveLeads.push({
        leadId: lead.id,
        customer: lead.customer,
        salesRep: lead.assignedSalesRep,
        lastActivity: lastActivity.toISOString(),
        hoursInactive: Math.floor(hoursInactive),
        task: lead.tasks[0] || null,
      })
    }

    // Calculate averages
    const salesRepList = Object.values(salesRepStats).map((stats) => ({
      ...stats,
      averageHoursInactive:
        stats.inactiveCount > 0
          ? Math.floor(stats.totalHoursInactive / stats.inactiveCount)
          : 0,
    }))

    const totalInactiveLeads = inactiveLeads.length
    const totalUnacknowledgedTasks = inactiveLeads.filter(
      (l) => l.task && l.task.status === "PENDING"
    ).length

    return NextResponse.json(
      {
        summary: {
          totalInactiveLeads,
          totalUnacknowledgedTasks,
          salesRepStats: salesRepList,
        },
        inactiveLeads,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching follow-ups:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch follow-ups" },
      { status: 500 }
    )
  }
}

