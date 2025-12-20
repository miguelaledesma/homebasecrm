import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const phone = searchParams.get("phone")
    const email = searchParams.get("email")

    if (!phone && !email) {
      return NextResponse.json(
        { error: "Phone or email is required" },
        { status: 400 }
      )
    }

    // Search for customer by phone or email
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          ...(phone ? [{ phone }] : []),
          ...(email ? [{ email }] : []),
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
    })

    if (customer) {
      return NextResponse.json({
        found: true,
        isCustomer: true,
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          email: customer.email,
        },
      })
    }

    return NextResponse.json({
      found: false,
      isCustomer: false,
    })
  } catch (error: any) {
    console.error("Error searching referrer:", error)
    return NextResponse.json(
      { error: error.message || "Failed to search referrer" },
      { status: 500 }
    )
  }
}

