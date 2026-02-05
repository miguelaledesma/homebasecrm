import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LeadStatus, LeadType } from "@prisma/client"
import { logError, logInfo } from "@/lib/utils"

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

const getDealValue = (quotes: { amount: number | null }[]) => {
  if (!quotes || quotes.length === 0) return 0
  const amounts = quotes
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

    const now = new Date()
    const monthStart = startOfMonth(now)

    const [wonLeads, lostLeads] = await Promise.all([
      prisma.lead.findMany({
        where: { status: LeadStatus.WON },
        select: {
          id: true,
          closedDate: true,
          createdAt: true,
          leadTypes: true,
          creditScore: true,
          quotes: { select: { amount: true } },
        },
      }),
      prisma.lead.findMany({
        where: { status: LeadStatus.LOST },
        select: {
          id: true,
          closedDate: true,
          createdAt: true,
          leadTypes: true,
          creditScore: true,
          quotes: { select: { amount: true } },
        },
      }),
    ])

    const calcValueForPeriod = (items: typeof wonLeads, useClosedDate: boolean) =>
      items.reduce((acc, lead) => {
        const closedOrCreated = lead.closedDate || lead.createdAt
        if (useClosedDate && closedOrCreated < monthStart) return acc
        return acc + getDealValue(lead.quotes || [])
      }, 0)

    const calcCountForPeriod = (items: typeof wonLeads, useClosedDate: boolean) =>
      items.filter((lead) => (lead.closedDate || lead.createdAt) >= monthStart).length

    const wonValueMonth = calcValueForPeriod(wonLeads, true)
    const lostValueMonth = calcValueForPeriod(lostLeads, true)
    const wonCountMonth = calcCountForPeriod(wonLeads, true)
    const lostCountMonth = calcCountForPeriod(lostLeads, true)

    const totalWon = wonLeads.length
    const totalLost = lostLeads.length
    const winRatePercent =
      totalWon + totalLost > 0 ? ((totalWon / (totalWon + totalLost)) * 100).toFixed(1) : "0.0"

    const daysToCloseValues = wonLeads
      .map((lead) => getDaysToClose(lead.createdAt, lead.closedDate))
      .filter((v): v is number => typeof v === "number")
    const avgDaysToClose =
      daysToCloseValues.length > 0
        ? Number((daysToCloseValues.reduce((a, b) => a + b, 0) / daysToCloseValues.length).toFixed(1))
        : null

    // Win rate by service type
    const serviceStats: Record<
      string,
      {
        won: number
        lost: number
      }
    > = {}

    const accumulate = (leads: typeof wonLeads, status: "won" | "lost") => {
      leads.forEach((lead) => {
        lead.leadTypes.forEach((type) => {
          if (!serviceStats[type]) {
            serviceStats[type] = { won: 0, lost: 0 }
          }
          serviceStats[type][status] += 1
        })
      })
    }

    accumulate(wonLeads, "won")
    accumulate(lostLeads, "lost")

    const winRateByService = Object.entries(serviceStats).map(([type, counts]) => {
      const total = counts.won + counts.lost
      const winRate = total > 0 ? Number(((counts.won / total) * 100).toFixed(1)) : 0
      return {
        leadType: type as LeadType,
        winCount: counts.won,
        lostCount: counts.lost,
        winRatePercent: winRate,
      }
    })

    logInfo("GET /api/analytics/win-rate", {
      userId: session.user.id,
    })

    return NextResponse.json(
      {
        summary: {
          wonCountMonth,
          wonValueMonth,
          lostCountMonth,
          lostValueMonth,
          winRatePercent: Number(winRatePercent),
          avgDaysToClose,
        },
        winRateByService,
      },
      { status: 200 }
    )
  } catch (error: any) {
    logError("Error fetching win rate analytics", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch analytics" },
      { status: 500 }
    )
  }
}
