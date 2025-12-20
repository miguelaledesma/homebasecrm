import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { SourceType, LeadType } from "@prisma/client"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      firstName,
      lastName,
      phone,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      sourceType,
      leadTypes,
      description,
      // Referral fields
      referrerFirstName,
      referrerLastName,
      referrerPhone,
      referrerEmail,
    } = body

    // Validate required fields
    if (!firstName || !lastName || !sourceType || !leadTypes || leadTypes.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }
    
    // Validate: if OTHER is selected, description is required
    if (leadTypes.includes("OTHER") && !description?.trim()) {
      return NextResponse.json(
        { error: "Description is required when 'Other' is selected" },
        { status: 400 }
      )
    }

    // Check if customer already exists (by phone or email)
    let customer = null
    if (phone || email) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [
            ...(phone ? [{ phone }] : []),
            ...(email ? [{ email }] : []),
          ],
        },
      })
    }

    // Create or update customer
    if (customer) {
      // Update existing customer with new info if provided
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: firstName || customer.firstName,
          lastName: lastName || customer.lastName,
          phone: phone || customer.phone,
          email: email || customer.email,
          addressLine1: addressLine1 || customer.addressLine1,
          addressLine2: addressLine2 || customer.addressLine2,
          city: city || customer.city,
          state: state || customer.state,
          zip: zip || customer.zip,
          sourceType: sourceType || customer.sourceType,
        },
      })
    } else {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          firstName,
          lastName,
          phone: phone || null,
          email: email || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          sourceType: sourceType as SourceType,
        },
      })
    }

    // Handle referral information if sourceType is REFERRAL
    let referrerCustomerId: string | null = null
    let referrerIsCustomer = false

    if (sourceType === "REFERRAL" && (referrerPhone || referrerEmail)) {
      // Check if referrer is an existing customer
      const referrerCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            ...(referrerPhone ? [{ phone: referrerPhone }] : []),
            ...(referrerEmail ? [{ email: referrerEmail }] : []),
          ],
        },
      })

      if (referrerCustomer) {
        referrerCustomerId = referrerCustomer.id
        referrerIsCustomer = true
      }
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        customerId: customer.id,
        leadTypes: leadTypes as LeadType[],
        description: description || null,
        status: "NEW",
        // Referral fields
        referrerFirstName: sourceType === "REFERRAL" ? referrerFirstName || null : null,
        referrerLastName: sourceType === "REFERRAL" ? referrerLastName || null : null,
        referrerPhone: sourceType === "REFERRAL" ? referrerPhone || null : null,
        referrerEmail: sourceType === "REFERRAL" ? referrerEmail || null : null,
        referrerCustomerId: referrerCustomerId,
        referrerIsCustomer: referrerIsCustomer,
      },
      include: {
        customer: true,
        assignedSalesRep: true,
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

    return NextResponse.json({ lead, customer }, { status: 201 })
  } catch (error: any) {
    console.error("Error creating lead:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create lead" },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const myLeads = searchParams.get("myLeads") === "true"

    const where: any = {}

    // Filter by status if provided
    if (status) {
      where.status = status
    }

    // Filter by assigned sales rep if user is SALES_REP and myLeads is true
    if (myLeads && session.user.role === "SALES_REP") {
      where.assignedSalesRepId = session.user.id
    }

    // ADMIN can see all leads, SALES_REP only sees their assigned leads
    if (session.user.role === "SALES_REP" && !myLeads) {
      where.assignedSalesRepId = session.user.id
    }

    const leads = await prisma.lead.findMany({
      where,
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ leads }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching leads:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch leads" },
      { status: 500 }
    )
  }
}

