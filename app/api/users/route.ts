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
    const allUsers = searchParams.get("all") === "true"

    // If admin requests all users, return all users; otherwise return only sales reps
    if (allUsers && session.user.role === "ADMIN") {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      })
      return NextResponse.json({ users }, { status: 200 })
    }

    // Return ADMIN, SALES_REP, and CONCIERGE users for assignment dropdowns
    const assignableUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "SALES_REP", "CONCIERGE"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json({ users: assignableUsers }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

