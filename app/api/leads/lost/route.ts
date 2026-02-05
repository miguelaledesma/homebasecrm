import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LeadStatus, LeadType } from "@prisma/client"
import { logError, logInfo } from "@/lib/utils"

type SortOption = "date" | "value"
type SortDirection = "asc" | "desc"

const DEAL_LOST_PREFIX = "Lead marked as lost. Reason:"

const getDealValue = (quotes: { amount: number | null }[]) => {
  if (!quotes || quotes.length === 0) return 0
  const amounts = quotes
    .map((q) => (typeof q.amount === "number" ? q.amount : null))
    .filter((q) => q !== null) as number[]
  if (amounts.length === 0) return 0
  return Math.max(...amounts)
}

const extractLossReason = (noteContent?: string | null) => {
  if (!noteContent) return null
  const prefix = DEAL_LOST_PREFIX
  const idx = noteContent.toLowerCase().indexOf(prefix.toLowerCase())
  if (idx === -1) return null
  const reason = noteContent.substring(idx + prefix.length).trim()
  return reason || null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can access lost leads
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
      status: LeadStatus.LOST,
    }

    if (leadType) {
      where.leadTypes = { has: leadType }
    }

    if (repId) {
      where.assignedSalesRepId = repId
    }

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
        creditScore: true,
        customer: true,
        assignedSalesRep: {
          select: { id: true, name: true, email: true },
        },
        quotes: {
          select: { amount: true },
        },
        notes: {
          where: {
            content: {
              contains: DEAL_LOST_PREFIX,
              mode: "insensitive",
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        closedDate: "desc",
      },
    })

    const mapped = leads.map((lead) => {
      const dealValue = getDealValue(lead.quotes || [])
      const lossNote = lead.notes?.[0]
      const lossReason = extractLossReason(lossNote?.content)
      return {
        id: lead.id,
        status: lead.status,
        closedDate: lead.closedDate ? lead.closedDate.toISOString() : null,
        createdAt: lead.createdAt.toISOString(),
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
        lossReason,
      }
    })

    const sorted = [...mapped].sort((a, b) => {
      const dir = direction === "asc" ? 1 : -1
      if (sort === "value") {
        return (a.dealValue || 0) > (b.dealValue || 0) ? dir : -dir
      }
      return (a.closedDate || a.createdAt) > (b.closedDate || b.createdAt) ? dir : -dir
    })

    logInfo("GET /api/leads/lost", {
      userId: session.user.id,
      leadType,
      repId,
      search: search || undefined,
      startDate: startDateParam || undefined,
      endDate: endDateParam || undefined,
    })

    return NextResponse.json({ leads: sorted }, { status: 200 })
  } catch (error: any) {
    logError("Error fetching lost leads", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch lost leads" },
      { status: 500 }
    )
  }
}
