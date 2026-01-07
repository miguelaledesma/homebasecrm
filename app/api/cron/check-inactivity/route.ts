import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getLastActivityTimestamp } from "@/lib/lead-activity"

// POST /api/cron/check-inactivity - Cron job to check for 48-hour inactivity
// Protected by secret token in header
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret token
    const cronSecret = request.headers.get("X-Cron-Secret")
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret) {
      console.error("CRON_SECRET environment variable not set")
      return NextResponse.json(
        { error: "Cron secret not configured" },
        { status: 500 }
      )
    }

    if (cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Query all leads with assigned sales rep and not in terminal states
    const leads = await prisma.lead.findMany({
      where: {
        assignedSalesRepId: { not: null },
        status: { notIn: ["WON", "LOST"] },
      },
      select: {
        id: true,
        assignedSalesRepId: true,
      },
    })

    let notificationsCreated = 0
    let tasksCreated = 0
    const errors: string[] = []

    for (const lead of leads) {
      try {
        if (!lead.assignedSalesRepId) continue

        // Calculate last activity timestamp
        const lastActivity = await getLastActivityTimestamp(lead.id)

        if (!lastActivity) {
          // No activity found, skip (shouldn't happen for assigned leads)
          continue
        }

        // Check if inactive for more than 48 hours
        const hoursSinceActivity =
          (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)

        if (hoursSinceActivity <= 48) {
          continue // Lead is still active
        }

        // Check if task already exists (unique constraint prevents duplicates)
        const existingTask = await prisma.task.findFirst({
          where: {
            leadId: lead.id,
            type: "LEAD_INACTIVITY",
          },
        })

        // Only create if task doesn't exist
        if (!existingTask) {
          // Create task first
          const task = await prisma.task.create({
            data: {
              userId: lead.assignedSalesRepId,
              leadId: lead.id,
              type: "LEAD_INACTIVITY",
              status: "PENDING",
            },
          })

          // Check if sales rep already has unacknowledged notification
          const existingSalesRepNotification = await prisma.notification.findFirst({
            where: {
              userId: lead.assignedSalesRepId,
              leadId: lead.id,
              type: "LEAD_INACTIVITY",
              acknowledged: false,
            },
          })

          // Create notification for sales rep if doesn't exist
          if (!existingSalesRepNotification) {
            await prisma.notification.create({
              data: {
                userId: lead.assignedSalesRepId,
                leadId: lead.id,
                type: "LEAD_INACTIVITY",
                taskId: task.id,
              },
            })
            notificationsCreated++
          }

          // Create notifications for all admins (check each admin individually)
          const admins = await prisma.user.findMany({
            where: { role: "ADMIN" },
            select: { id: true },
          })

          for (const admin of admins) {
            // Check if this admin already has unacknowledged notification for this lead
            const existingAdminNotification = await prisma.notification.findFirst({
              where: {
                userId: admin.id,
                leadId: lead.id,
                type: "LEAD_INACTIVITY",
                acknowledged: false,
              },
            })

            if (!existingAdminNotification) {
              await prisma.notification.create({
                data: {
                  userId: admin.id,
                  leadId: lead.id,
                  type: "LEAD_INACTIVITY",
                  taskId: task.id, // Same task, different notification per admin
                },
              })
              notificationsCreated++
            }
          }

          tasksCreated++
        }
      } catch (error: any) {
        errors.push(`Error processing lead ${lead.id}: ${error.message}`)
        console.error(`Error processing lead ${lead.id}:`, error)
      }
    }

    return NextResponse.json(
      {
        success: true,
        processed: leads.length,
        notificationsCreated,
        tasksCreated,
        errors: errors.length > 0 ? errors : undefined,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error in inactivity check cron job:", error)
    return NextResponse.json(
      { error: error.message || "Failed to check inactivity" },
      { status: 500 }
    )
  }
}

