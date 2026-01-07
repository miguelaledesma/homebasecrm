import { prisma } from "@/lib/prisma"

/**
 * Calculate the last activity timestamp for a lead
 * Activity includes: lead updates, notes/comments, appointments, or quotes
 * 
 * @param leadId - The ID of the lead
 * @returns The most recent activity timestamp, or null if no activity found
 */
export async function getLastActivityTimestamp(leadId: string): Promise<Date | null> {
  // Get the lead to check its updatedAt
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { updatedAt: true },
  })

  if (!lead) {
    return null
  }

  // Get the most recent note for this lead
  const mostRecentNote = await prisma.leadNote.findFirst({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  // Get the most recent appointment for this lead
  const mostRecentAppointment = await prisma.appointment.findFirst({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  // Get the most recent quote for this lead
  const mostRecentQuote = await prisma.quote.findFirst({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  // Find the most recent timestamp among all activities
  const timestamps: Date[] = [lead.updatedAt]
  
  if (mostRecentNote) {
    timestamps.push(mostRecentNote.createdAt)
  }
  
  if (mostRecentAppointment) {
    timestamps.push(mostRecentAppointment.createdAt)
  }
  
  if (mostRecentQuote) {
    timestamps.push(mostRecentQuote.createdAt)
  }

  // Return the most recent timestamp
  return timestamps.length > 0 
    ? new Date(Math.max(...timestamps.map(t => t.getTime())))
    : null
}

/**
 * Check if a lead has been inactive for more than the specified hours
 * 
 * @param leadId - The ID of the lead
 * @param hours - Number of hours to check (default: 48)
 * @returns true if inactive for more than specified hours, false otherwise
 */
export async function isLeadInactive(leadId: string, hours: number = 48): Promise<boolean> {
  const lastActivity = await getLastActivityTimestamp(leadId)
  
  if (!lastActivity) {
    return true // No activity found, consider inactive
  }

  const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
  return hoursSinceActivity > hours
}

