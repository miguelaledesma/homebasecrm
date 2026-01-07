import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can create password reset tokens
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { userId } = body

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    // Invalidate any existing unused reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        used: true,
      },
    })

    // Generate a secure token
    const token = randomBytes(32).toString("hex")

    // Create reset token (expires in 24 hours)
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    const resetToken = await prisma.passwordResetToken.create({
      data: {
        userId,
        token,
        expiresAt,
        createdBy: session.user.id,
      },
    })

    // Generate reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
    const resetUrl = `${baseUrl}/auth/reset-password/${token}`

    return NextResponse.json(
      {
        resetToken: {
          id: resetToken.id,
          userId: resetToken.userId,
          email: user.email,
          expiresAt: resetToken.expiresAt,
          resetUrl,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creating password reset token:", error)
    return NextResponse.json(
      { 
        error: error.message || "Failed to create password reset token",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

