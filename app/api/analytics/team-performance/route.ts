import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeadStatus } from "@prisma/client"
import { logError, logInfo } from "@/lib/utils"

type TeamPerformanceStat = {
  userId: string
  userName: string | null
  userEmail: string
  totalLeads: number
  wonLeads: number
  winRate: number
  appointmentSetLeads: number
  conversionRate: number
  totalAppointments: number
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all sales reps (SALES_REP and CONCIERGE roles)
    const salesReps = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.SALES_REP, UserRole.CONCIERGE],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    // Get stats for each sales rep
    const statsPromises = salesReps.map(async (rep) => {
      const [
        totalLeads,
        wonLeads,
        appointmentSetLeads,
        totalAppointments,
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
      ])

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
        totalLeads,
        wonLeads,
        winRate,
        appointmentSetLeads,
        conversionRate,
        totalAppointments,
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
