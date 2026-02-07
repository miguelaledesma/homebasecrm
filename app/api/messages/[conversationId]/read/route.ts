import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH /api/messages/[conversationId]/read - Mark conversation as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId } = params

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.user.id,
        },
      },
    })

    if (!participant) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      )
    }

    // Update lastReadAt
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.user.id,
        },
      },
      data: {
        lastReadAt: new Date(),
      },
    })

    return NextResponse.json(
      {
        success: true,
        message: "Conversation marked as read",
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error marking conversation as read:", error)
    return NextResponse.json(
      { error: error.message || "Failed to mark conversation as read" },
      { status: 500 }
    )
  }
}
