import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeadStatus } from "@prisma/client"
import { getLastActivityTimestamp } from "@/lib/lead-activity"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = session.user.role

    if (userRole === UserRole.ADMIN) {
      // Admin dashboard stats
      const [
        totalLeads,
        appointmentSetLeads,
        newLeads,
        assignedLeads,
        quotedLeads,
        wonLeads,
        totalAppointments,
        scheduledAppointments,
        pastDueAppointments,
        unassignedLeads,
        assignedActiveLeadsForInactivity,
        jobsPendingFinancials,
      ] = await Promise.all([
        // Total leads
        prisma.lead.count(),
        
        // Leads with appointment set status
        prisma.lead.count({
          where: { status: LeadStatus.APPOINTMENT_SET },
        }),
        
        // New leads
        prisma.lead.count({
          where: { status: LeadStatus.NEW },
        }),
        
        // Assigned leads
        prisma.lead.count({
          where: { status: LeadStatus.ASSIGNED },
        }),
        
        // Quoted leads
        prisma.lead.count({
          where: { status: LeadStatus.QUOTED },
        }),
        
        // Won leads
        prisma.lead.count({
          where: { status: LeadStatus.WON },
        }),
        
        // Total appointments
        prisma.appointment.count(),
        
        // Scheduled appointments
        prisma.appointment.count({
          where: {
            status: "SCHEDULED",
            scheduledFor: {
              gte: new Date(),
            },
          },
        }),
        
        // Past due appointments (scheduledFor < now() AND status = SCHEDULED)
        prisma.appointment.count({
          where: {
            status: "SCHEDULED",
            scheduledFor: {
              lt: new Date(),
            },
          },
        }),
        
        // Unassigned leads (leads with no assigned sales rep)
        prisma.lead.count({
          where: { 
            assignedSalesRepId: null,
            status: { notIn: [LeadStatus.WON, LeadStatus.LOST] }
          },
        }),
        
        // Get all assigned leads (not won/lost) to calculate inactive count
        // We'll calculate inactivity in the next step
        prisma.lead.findMany({
          where: {
            assignedSalesRepId: { not: null },
            status: { notIn: [LeadStatus.WON, LeadStatus.LOST] }
          },
          select: { id: true }
        }),
        
        // Jobs pending financials - get all ACCEPTED quotes with DONE job status
        // We'll filter for quotes without P&L files in the next step
        prisma.quote.findMany({
          where: {
            status: "ACCEPTED",
            lead: {
              jobStatus: "DONE"
            }
          },
          select: { 
            id: true,
          }
        }),
      ])

      // Calculate inactive leads count (leads with 48+ hours of no activity)
      let overdueFollowUps = 0
      try {
        const inactivityResults = await Promise.all(
          assignedActiveLeadsForInactivity.map(async (lead) => {
            try {
              const lastActivity = await getLastActivityTimestamp(lead.id)
              const hoursSinceActivity = lastActivity
                ? (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
                : null
              return hoursSinceActivity !== null && hoursSinceActivity > 48
            } catch (error) {
              return false
            }
          })
        )
        overdueFollowUps = inactivityResults.filter(Boolean).length
      } catch (error) {
        console.error("Error calculating inactive leads:", error)
        // If calculation fails, default to 0
        overdueFollowUps = 0
      }

      // Calculate jobs pending financials count (quotes without P&L files)
      const quoteIds = jobsPendingFinancials.map(q => q.id)
      const plFiles = await prisma.quoteFile.findMany({
        where: {
          quoteId: { in: quoteIds },
          isProfitLoss: true,
        },
        select: {
          quoteId: true,
        },
      })
      const quotesWithPL = new Set(plFiles.map(f => f.quoteId))
      const jobsPendingFinancialsCount = jobsPendingFinancials.filter(quote => {
        return !quotesWithPL.has(quote.id)
      }).length

      // Calculate conversion rates
      const leadToAppointmentRate =
        totalLeads > 0
          ? ((appointmentSetLeads / totalLeads) * 100).toFixed(1)
          : "0.0"

      const winRate =
        totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : "0.0"

      return NextResponse.json(
        {
          stats: {
            totalLeads,
            appointmentSetLeads,
            newLeads,
            assignedLeads,
            quotedLeads,
            wonLeads,
            totalAppointments,
            scheduledAppointments,
            pastDueAppointments,
            unassignedLeads,
            overdueFollowUps,
            jobsPendingFinancials: jobsPendingFinancialsCount,
            leadToAppointmentRate: parseFloat(leadToAppointmentRate),
            winRate: parseFloat(winRate),
          },
        },
        { status: 200 }
      )
    } else {
      // Sales Rep dashboard stats
      const [
        myTotalLeads,
        myAppointmentSetLeads,
        myNewLeads,
        myAssignedLeads,
        myQuotedLeads,
        myWonLeads,
        myTotalAppointments,
        myScheduledAppointments,
        myLeadsWithAppointments,
        myPastDueAppointments,
      ] = await Promise.all([
        // My total leads
        prisma.lead.count({
          where: { assignedSalesRepId: userId },
        }),
        
        // My leads with appointment set status
        prisma.lead.count({
          where: {
            assignedSalesRepId: userId,
            status: LeadStatus.APPOINTMENT_SET,
          },
        }),
        
        // My new leads
        prisma.lead.count({
          where: {
            assignedSalesRepId: userId,
            status: LeadStatus.NEW,
          },
        }),
        
        // My assigned leads
        prisma.lead.count({
          where: {
            assignedSalesRepId: userId,
            status: LeadStatus.ASSIGNED,
          },
        }),
        
        // My quoted leads
        prisma.lead.count({
          where: {
            assignedSalesRepId: userId,
            status: LeadStatus.QUOTED,
          },
        }),
        
        // My won leads
        prisma.lead.count({
          where: {
            assignedSalesRepId: userId,
            status: LeadStatus.WON,
          },
        }),
        
        // My total appointments
        prisma.appointment.count({
          where: { salesRepId: userId },
        }),
        
        // My scheduled appointments
        prisma.appointment.count({
          where: {
            salesRepId: userId,
            status: "SCHEDULED",
            scheduledFor: {
              gte: new Date(),
            },
          },
        }),
        
        // My leads that have appointments
        prisma.lead.count({
          where: {
            assignedSalesRepId: userId,
            appointments: {
              some: {},
            },
          },
        }),
        
        // My past due appointments (scheduledFor < now() AND status = SCHEDULED)
        prisma.appointment.count({
          where: {
            salesRepId: userId,
            status: "SCHEDULED",
            scheduledFor: {
              lt: new Date(),
            },
          },
        }),
      ])

      // Calculate conversion rates
      const leadToAppointmentRate =
        myTotalLeads > 0
          ? ((myLeadsWithAppointments / myTotalLeads) * 100).toFixed(1)
          : "0.0"

      const winRate =
        myTotalLeads > 0
          ? ((myWonLeads / myTotalLeads) * 100).toFixed(1)
          : "0.0"

      return NextResponse.json(
        {
          stats: {
            totalLeads: myTotalLeads,
            appointmentSetLeads: myAppointmentSetLeads,
            newLeads: myNewLeads,
            assignedLeads: myAssignedLeads,
            quotedLeads: myQuotedLeads,
            wonLeads: myWonLeads,
            totalAppointments: myTotalAppointments,
            scheduledAppointments: myScheduledAppointments,
            leadsWithAppointments: myLeadsWithAppointments,
            pastDueAppointments: myPastDueAppointments,
            leadToAppointmentRate: parseFloat(leadToAppointmentRate),
            winRate: parseFloat(winRate),
          },
        },
        { status: 200 }
      )
    }
  } catch (error: any) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}

