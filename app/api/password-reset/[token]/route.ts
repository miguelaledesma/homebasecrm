import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "Invalid reset token" },
        { status: 404 }
      )
    }

    if (resetToken.used) {
      return NextResponse.json(
        { error: "This reset token has already been used" },
        { status: 400 }
      )
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: "This reset token has expired" },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        resetToken: {
          email: resetToken.user.email,
          name: resetToken.user.name,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching reset token:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch reset token" },
      { status: 500 }
    )
  }
}

