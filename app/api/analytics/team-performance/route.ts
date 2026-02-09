import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeadStatus } from "@prisma/client"
import { logError, logInfo } from "@/lib/utils"
import { getLastActivityTimestamp } from "@/lib/lead-activity"

type TeamPerformanceStat = {
  userId: string
  userName: string | null
  userEmail: string
  userRole: UserRole
  totalLeads: number
  wonLeads: number
  winRate: number
  appointmentSetLeads: number
  conversionRate: number
  totalAppointments: number
  overdueFollowUps: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // For admins, show all users. For others, show only sales reps and concierges
    const isAdmin = session.user.role === UserRole.ADMIN
    const salesReps = await prisma.user.findMany({
      where: isAdmin
        ? {} // No filter - get all users
        : {
            role: {
              in: [UserRole.SALES_REP, UserRole.CONCIERGE],
            },
          },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    // Get stats for each sales rep
    const statsPromises = salesReps.map(async (rep) => {
      const [
        totalLeads,
        wonLeads,
        appointmentSetLeads,
        totalAppointments,
        activeAssignedLeads,
      ] = await Promise.all([
        // Total assigned leads
        prisma.lead.count({
          where: { assignedSalesRepId: rep.id },
        }),
        // Won leads
        prisma.lead.count({
          where: {
            assignedSalesRepId: rep.id,
            status: LeadStatus.WON,
          },
        }),
        // Leads with appointment set
        prisma.lead.count({
          where: {
            assignedSalesRepId: rep.id,
            status: LeadStatus.APPOINTMENT_SET,
          },
        }),
        // Total appointments
        prisma.appointment.count({
          where: { salesRepId: rep.id },
        }),
        // Active assigned leads for overdue calculation
        prisma.lead.findMany({
          where: {
            assignedSalesRepId: rep.id,
            status: { notIn: [LeadStatus.WON, LeadStatus.LOST] },
          },
          select: { id: true },
        }),
      ])

      // Calculate overdue follow-ups (48+ hours inactive)
      let overdueFollowUps = 0
      try {
        const inactivityResults = await Promise.all(
          activeAssignedLeads.map(async (lead) => {
            try {
              const lastActivity = await getLastActivityTimestamp(lead.id)
              const hoursSinceActivity = lastActivity
                ? (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
                : null
              return hoursSinceActivity !== null && hoursSinceActivity > 48
            } catch {
              return false
            }
          })
        )
        overdueFollowUps = inactivityResults.filter(Boolean).length
      } catch {
        overdueFollowUps = 0
      }

      // Calculate rates
      const winRate =
        totalLeads > 0 ? Number(((wonLeads / totalLeads) * 100).toFixed(1)) : 0
      
      const conversionRate =
        totalLeads > 0
          ? Number(((appointmentSetLeads / totalLeads) * 100).toFixed(1))
          : 0

      return {
        userId: rep.id,
        userName: rep.name,
        userEmail: rep.email,
        userRole: rep.role,
        totalLeads,
        wonLeads,
        winRate,
        appointmentSetLeads,
        conversionRate,
        totalAppointments,
        overdueFollowUps,
      } as TeamPerformanceStat
    })

    const stats = await Promise.all(statsPromises)

    // Sort by won leads (descending) for ranking
    const sortedStats = stats.sort((a, b) => b.wonLeads - a.wonLeads)

    logInfo("GET /api/analytics/team-performance", {
      userId: session.user.id,
      statsCount: sortedStats.length,
    })

    return NextResponse.json(
      {
        stats: sortedStats,
      },
      { status: 200 }
    )
  } catch (error: any) {
    logError("Error fetching team performance analytics", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch team performance stats" },
      { status: 500 }
    )
  }
}
