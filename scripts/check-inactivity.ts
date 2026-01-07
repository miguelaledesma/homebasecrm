import { prisma } from "../lib/prisma"
import { getLastActivityTimestamp } from "../lib/lead-activity"

/**
 * Standalone script to check for 48-hour lead inactivity
 * This script is designed to be run by Railway cron jobs
 * It should exit immediately after completing the task
 */
async function checkInactivity() {
  try {
    console.log("Starting inactivity check...")

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

    console.log(`Found ${leads.length} leads to check`)

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
                  // Don't set taskId for admin notifications - taskId is unique and only one notification can reference a task
                  // The sales rep notification already has the taskId link
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

    console.log(`Processed ${leads.length} leads`)
    console.log(`Created ${notificationsCreated} notifications`)
    console.log(`Created ${tasksCreated} tasks`)
    if (errors.length > 0) {
      console.error(`Errors: ${errors.length}`)
      errors.forEach((error) => console.error(error))
    }

    console.log("Inactivity check completed successfully")
  } catch (error: any) {
    console.error("Fatal error in inactivity check:", error)
    process.exit(1)
  } finally {
    // Close Prisma connection and exit
    await prisma.$disconnect()
    process.exit(0)
  }
}

// Run the check
checkInactivity()

