import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, LeadStatus } from "@prisma/client"

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
      ])

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

