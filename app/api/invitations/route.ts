import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create invitations
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { email, role, name } = body

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Check if there's already a pending invitation for this email
    const existingInvitation = await prisma.userInvitation.findFirst({
      where: {
        email,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: "An active invitation already exists for this email" },
        { status: 400 }
      )
    }

    // Generate a secure token
    const token = randomBytes(32).toString("hex")

    // Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.userInvitation.create({
      data: {
        email,
        role,
        token,
        expiresAt,
        createdBy: session.user.id,
      },
    })

    // Generate invitation URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const invitationUrl = `${baseUrl}/auth/invite/${token}`

    return NextResponse.json(
      {
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          invitationUrl,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creating invitation:", error)
    console.error("Error stack:", error.stack)
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta,
    })
    return NextResponse.json(
      { 
        error: error.message || "Failed to create invitation",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

