import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

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

    return NextResponse.json(
      {
        invitation: {
          email: invitation.email,
          role: invitation.role,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching invitation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch invitation" },
      { status: 500 }
    )
  }
}

