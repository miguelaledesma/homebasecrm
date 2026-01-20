import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LeadStatus, JobStatus } from "@prisma/client"
import { logError, logInfo, logAction } from "@/lib/utils"

const DEAL_LOST_PREFIX = "Lead marked as lost. Reason:"
const DEAL_WON_NOTE = "Lead marked as won."

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const leadId = params.id
    const body = await request.json()
    const { status, reason, jobStatus, jobCompletedDate } = body as { 
      status?: LeadStatus; 
      reason?: string; 
      jobStatus?: JobStatus | null;
      jobCompletedDate?: string | null;
    }

    if (!status || (status !== LeadStatus.WON && status !== LeadStatus.LOST)) {
      return NextResponse.json(
        { error: "Status must be WON or LOST" },
        { status: 400 }
      )
    }

    if (status === LeadStatus.LOST && (!reason || !reason.trim())) {
      return NextResponse.json(
        { error: "Loss reason is required when marking a lead as lost" },
        { status: 400 }
      )
    }

    const existingLead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        status: true,
        assignedSalesRepId: true,
        customerId: true,
        createdAt: true,
      },
    })

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Access control: 
    // - Admin can close any lead
    // - CONCIERGE can close their assigned leads
    // - Sales rep can close only their assigned leads
    if (
      (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE") &&
      existingLead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Always allow setting to WON or LOST (even if already closed, allows changing between them or updating date)
    // Note: Since we validate status must be WON or LOST above, this check is mainly for clarity
    // We allow re-setting WON/LOST to update the closedDate

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status,
        closedDate: now,
      };
      
      if (status === LeadStatus.WON && jobStatus !== undefined) {
        updateData.jobStatus = jobStatus;
        // If setting jobStatus to DONE, set jobCompletedDate
        if (jobStatus === "DONE" && jobCompletedDate) {
          // Parse date string (YYYY-MM-DD) and create date at local midnight to avoid timezone issues
          const [year, month, day] = jobCompletedDate.split("-").map(Number);
          updateData.jobCompletedDate = new Date(year, month - 1, day);
        } else if (jobStatus !== "DONE") {
          // Clear completion date if status is not DONE
          updateData.jobCompletedDate = null;
        }
      }
      
      const updatedLead = await tx.lead.update({
        where: { id: leadId },
        data: updateData,
        include: {
          customer: true,
          assignedSalesRep: {
            select: { id: true, name: true, email: true },
          },
          referrerCustomer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
            },
          },
          createdByUser: {
            select: { id: true, name: true, email: true },
          },
        },
      })

      // Create a note when marking as LOST (always, to track reasons)
      // Create a note when marking as WON only if status is changing
      if (status === LeadStatus.LOST && reason) {
        const noteContent = `${DEAL_LOST_PREFIX} ${reason.trim()}`
        await tx.leadNote.create({
          data: {
            leadId,
            content: noteContent,
            createdBy: session.user.id,
          },
        })
      } else if (status === LeadStatus.WON && existingLead.status !== LeadStatus.WON) {
        // Only create WON note if status is actually changing to WON
        await tx.leadNote.create({
          data: {
            leadId,
            content: DEAL_WON_NOTE,
            createdBy: session.user.id,
          },
        })
      }

      return updatedLead
    })

    logAction("Lead closed", session.user.id, session.user.role, {
      leadId,
      status,
      jobStatus: status === LeadStatus.WON ? jobStatus : undefined,
      reason: status === LeadStatus.LOST ? reason : undefined,
    }, session.user.name || session.user.email)

    return NextResponse.json({ lead: result }, { status: 200 })
  } catch (error: any) {
    logError("Error closing lead", error, { leadId: params.id })
    return NextResponse.json(
      { error: error.message || "Failed to close lead" },
      { status: 500 }
    )
  }
}
