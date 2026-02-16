import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"

// GET /api/messages/[conversationId] - Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")

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

    // Get messages with attachments
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attachments: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
      skip: offset,
    })

    // Generate download URLs for attachments
    const messagesWithUrls = await Promise.all(
      messages.map(async (msg) => {
        if (msg.attachments.length === 0) return { ...msg, attachments: [] }

        const attachmentsWithUrls = await Promise.all(
          msg.attachments.map(async (att) => {
            let downloadUrl = att.filePath
            try {
              if (storage.getFileUrl) {
                downloadUrl = await storage.getFileUrl(att.filePath, 3600)
              }
            } catch {
              // fallback to path
            }
            return { ...att, downloadUrl }
          })
        )
        return { ...msg, attachments: attachmentsWithUrls }
      })
    )

    // Get total count
    const total = await prisma.message.count({
      where: {
        conversationId,
      },
    })

    return NextResponse.json(
      {
        messages: messagesWithUrls,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch messages" },
      { status: 500 }
    )
  }
}

// PATCH /api/messages/[conversationId] - Update conversation (rename)
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
    const body = await request.json()
    const { name } = body

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

    // Verify it's a group conversation (can't rename direct messages)
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    if (conversation.type !== "GROUP") {
      return NextResponse.json(
        { error: "Cannot rename a direct message conversation" },
        { status: 400 }
      )
    }

    // Update the conversation name
    const updated = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        name: name && typeof name === "string" && name.trim().length > 0
          ? name.trim()
          : null,
      },
    })

    return NextResponse.json(
      {
        conversation: {
          id: updated.id,
          name: updated.name,
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error updating conversation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update conversation" },
      { status: 500 }
    )
  }
}

// POST /api/messages/[conversationId] - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId } = params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      )
    }

    // Validate content length (max 5000 chars)
    const trimmedContent = content.trim()
    if (trimmedContent.length > 5000) {
      return NextResponse.json(
        { error: "Message content cannot exceed 5000 characters" },
        { status: 400 }
      )
    }

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

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: session.user.id,
        content: trimmedContent,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        attachments: true,
      },
    })

    // Update conversation's updatedAt
    await prisma.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(
      {
        message,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error sending message:", error)
    return NextResponse.json(
      { error: error.message || "Failed to send message" },
      { status: 500 }
    )
  }
}

// DELETE /api/messages/[conversationId] - Delete a conversation
export async function DELETE(
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

    // Get conversation info to check participants
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: true,
        messages: {
          include: { attachments: true },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    // Remove this user from the conversation (soft delete - just remove their participation)
    // The conversation and messages remain for other participants
    await prisma.conversationParticipant.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.user.id,
        },
      },
    })

    // Check if there are any participants left
    const remainingParticipants = await prisma.conversationParticipant.count({
      where: { conversationId },
    })

    // If no participants remain, delete the entire conversation and all its data
    if (remainingParticipants === 0) {
      // Get all attachments to delete files from storage
      const filePathsToDelete: string[] = []
      for (const message of conversation.messages) {
        for (const attachment of message.attachments) {
          // Only delete if it's not a data URL (mock storage)
          if (!attachment.filePath.includes("data:")) {
            filePathsToDelete.push(attachment.filePath)
          }
        }
      }

      // Delete files from storage
      for (const filePath of filePathsToDelete) {
        try {
          await storage.deleteFile(filePath)
        } catch (error) {
          // Log but don't fail - file might already be deleted or not exist
          console.error(`Failed to delete file ${filePath}:`, error)
        }
      }

      // Delete the entire conversation (cascade will delete messages and attachments)
      await prisma.conversation.delete({
        where: { id: conversationId },
      })
    }

    return NextResponse.json(
      { message: "Conversation deleted successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting conversation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete conversation" },
      { status: 500 }
    )
  }
}
