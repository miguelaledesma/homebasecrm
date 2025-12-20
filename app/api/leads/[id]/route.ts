import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { LeadStatus } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
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
      },
    })

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // Check permissions: SALES_REP can only see their assigned leads
    if (
      session.user.role === "SALES_REP" &&
      lead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ lead }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching lead:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch lead" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { status, assignedSalesRepId } = body

    // Check if lead exists and user has permission
    const existingLead = await prisma.lead.findUnique({
      where: { id: params.id },
    })

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    // SALES_REP can only update their own leads
    if (
      session.user.role === "SALES_REP" &&
      existingLead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Only ADMIN can assign sales reps
    if (assignedSalesRepId && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can assign sales reps" },
        { status: 403 }
      )
    }

    // Verify assigned sales rep exists if provided
    if (assignedSalesRepId) {
      const salesRep = await prisma.user.findUnique({
        where: { id: assignedSalesRepId },
      })
      if (!salesRep || salesRep.role !== "SALES_REP") {
        return NextResponse.json(
          { error: "Invalid sales rep" },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (status) {
      updateData.status = status as LeadStatus
    }
    if (assignedSalesRepId !== undefined) {
      updateData.assignedSalesRepId = assignedSalesRepId || null
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
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
      },
    })

    return NextResponse.json({ lead }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating lead:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update lead" },
      { status: 500 }
    )
  }
}

