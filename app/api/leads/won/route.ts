import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LeadStatus, LeadType, QuoteStatus } from "@prisma/client"
import { logError, logInfo } from "@/lib/utils"

type SortOption = "date" | "value" | "daysToClose"
type SortDirection = "asc" | "desc"

const getDealValue = (quotes: { amount: number | null; status: QuoteStatus }[]) => {
  if (!quotes || quotes.length === 0) return 0
  // Only use ACCEPTED quotes for won leads
  const acceptedQuotes = quotes.filter((q) => q.status === QuoteStatus.ACCEPTED)
  if (acceptedQuotes.length === 0) return 0
  const amounts = acceptedQuotes
    .map((q) => (typeof q.amount === "number" ? q.amount : null))
    .filter((q) => q !== null) as number[]
  if (amounts.length === 0) return 0
  return Math.max(...amounts)
}

const getDaysToClose = (createdAt: Date, closedDate?: Date | null) => {
  if (!closedDate) return null
  const diff = closedDate.getTime() - createdAt.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return days < 0 ? 0 : days
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access won leads
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const leadType = searchParams.get("leadType") as LeadType | null
    const repId = searchParams.get("repId")
    const startDateParam = searchParams.get("startDate")
    const endDateParam = searchParams.get("endDate")
    const sort = (searchParams.get("sort") as SortOption | null) || "date"
    const direction = (searchParams.get("direction") as SortDirection | null) || "desc"

    const startDate = startDateParam ? new Date(startDateParam) : null
    const endDate = endDateParam ? new Date(endDateParam) : null

    const where: any = {
      status: LeadStatus.WON,
    }

    if (leadType) {
      where.leadTypes = { has: leadType }
    }

    if (repId) {
      where.assignedSalesRepId = repId
    }

    // Date range filter uses closedDate if available, otherwise createdAt
    if (startDate || endDate) {
      where.OR = [
        {
          closedDate: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        },
        {
          AND: [
            { closedDate: null },
            {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            },
          ],
        },
      ]
    }

    // Basic search on customer first/last name
    if (search.trim()) {
      where.customer = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      }
    }

    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        status: true,
        closedDate: true,
        createdAt: true,
        leadTypes: true,
        jobStatus: true,
        // Exclude creditScore - column doesn't exist in database yet
        customer: true,
        assignedSalesRep: {
          select: { id: true, name: true, email: true },
        },
        quotes: {
          select: { amount: true, status: true },
        },
      },
      orderBy: {
        closedDate: "desc",
      },
    })

    const mapped = leads.map((lead) => {
      const dealValue = getDealValue(lead.quotes || [])
      const closedDate = lead.closedDate
      const daysToClose = getDaysToClose(lead.createdAt, closedDate)

      return {
        id: lead.id,
        status: lead.status,
        closedDate: closedDate ? closedDate.toISOString() : null,
        createdAt: lead.createdAt.toISOString(),
        daysToClose,
        leadTypes: lead.leadTypes,
        customer: {
          firstName: lead.customer.firstName,
          lastName: lead.customer.lastName,
          phone: lead.customer.phone,
          email: lead.customer.email,
          addressLine1: lead.customer.addressLine1,
          addressLine2: lead.customer.addressLine2,
          city: lead.customer.city,
          state: lead.customer.state,
          zip: lead.customer.zip,
          sourceType: lead.customer.sourceType,
        },
        assignedSalesRep: lead.assignedSalesRep,
        dealValue,
        jobStatus: lead.jobStatus,
      }
    })

    const sorted = [...mapped].sort((a, b) => {
      const dir = direction === "asc" ? 1 : -1
      if (sort === "value") {
        return (a.dealValue || 0) > (b.dealValue || 0) ? dir : -dir
      }
      if (sort === "daysToClose") {
        return (a.daysToClose || 0) > (b.daysToClose || 0) ? dir : -dir
      }
      // date
      return (a.closedDate || a.createdAt) > (b.closedDate || b.createdAt) ? dir : -dir
    })

    logInfo("GET /api/leads/won", {
      userId: session.user.id,
      leadType,
      repId,
      search: search || undefined,
      startDate: startDateParam || undefined,
      endDate: endDateParam || undefined,
    })

    return NextResponse.json({ leads: sorted }, { status: 200 })
  } catch (error: any) {
    logError("Error fetching won leads", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch won leads" },
      { status: 500 }
    )
  }
}
