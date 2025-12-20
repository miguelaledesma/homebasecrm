import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const body = await request.json()
    const { name, password } = body

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      )
    }

    // Find invitation
    const invitation = await prisma.userInvitation.findUnique({
      where: { token },
    })

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation token" },
        { status: 404 }
      )
    }

    if (invitation.used) {
      return NextResponse.json(
        { error: "This invitation has already been used" },
        { status: 400 }
      )
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user and mark invitation as used in a transaction
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invitation.email,
          name: name || null,
          role: invitation.role,
          password: hashedPassword,
        },
      }),
      prisma.userInvitation.update({
        where: { id: invitation.id },
        data: { used: true },
      }),
    ])

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error accepting invitation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to accept invitation" },
      { status: 500 }
    )
  }
}

