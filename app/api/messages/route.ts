import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ConversationType } from "@prisma/client"

// GET /api/messages - List conversations for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    // Calculate unread counts and format response
    const formattedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const participant = conversation.participants.find(
          (p) => p.userId === session.user.id
        )
        const lastReadAt = participant?.lastReadAt

        // Count unread messages (messages after lastReadAt)
        const unreadCount = lastReadAt
          ? await prisma.message.count({
              where: {
                conversationId: conversation.id,
                createdAt: {
                  gt: lastReadAt,
                },
                senderId: {
                  not: session.user.id, // Don't count own messages
                },
              },
            })
          : await prisma.message.count({
              where: {
                conversationId: conversation.id,
                senderId: {
                  not: session.user.id,
                },
              },
            })

        // Get other participants (for direct messages, show the other person)
        const otherParticipants = conversation.participants.filter(
          (p) => p.userId !== session.user.id
        )

        // For direct messages, get the other participant's name
        const displayName =
          conversation.type === ConversationType.DIRECT
            ? otherParticipants[0]?.user.name ||
              otherParticipants[0]?.user.email ||
              "Unknown"
            : conversation.name || "Group Chat"

        return {
          id: conversation.id,
          name: displayName,
          type: conversation.type,
          unreadCount,
          lastMessage: conversation.messages[0]
            ? {
                id: conversation.messages[0].id,
                content: conversation.messages[0].content,
                sender: conversation.messages[0].sender,
                createdAt: conversation.messages[0].createdAt,
              }
            : null,
          participants: conversation.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
          })),
          updatedAt: conversation.updatedAt,
        }
      })
    )

    return NextResponse.json(
      {
        conversations: formattedConversations,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

// POST /api/messages - Create new conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { participantIds, name, type } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: "At least one participant is required" },
        { status: 400 }
      )
    }

    // Validate participant IDs exist
    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: participantIds,
        },
      },
    })

    if (participants.length !== participantIds.length) {
      return NextResponse.json(
        { error: "One or more participants not found" },
        { status: 400 }
      )
    }

    // Determine conversation type
    const conversationType =
      type === "GROUP" || participantIds.length > 1
        ? ConversationType.GROUP
        : ConversationType.DIRECT

    // For direct messages, check if conversation already exists
    if (conversationType === ConversationType.DIRECT) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          participants: {
            every: {
              userId: {
                in: [session.user.id, participantIds[0]],
              },
            },
          },
        },
        include: {
          participants: true,
        },
      })

      // Check if it has exactly 2 participants (current user + other)
      if (
        existingConversation &&
        existingConversation.participants.length === 2
      ) {
        return NextResponse.json(
          {
            conversation: {
              id: existingConversation.id,
              type: existingConversation.type,
            },
            message: "Conversation already exists",
          },
          { status: 200 }
        )
      }
    }

    // Create new conversation
    const conversation = await prisma.conversation.create({
      data: {
        name: conversationType === ConversationType.GROUP ? name : null,
        type: conversationType,
        participants: {
          create: [
            // Add current user
            {
              userId: session.user.id,
            },
            // Add other participants
            ...participantIds.map((userId: string) => ({
              userId,
            })),
          ],
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(
      {
        conversation: {
          id: conversation.id,
          type: conversation.type,
          name: conversation.name,
          participants: conversation.participants.map((p) => ({
            id: p.user.id,
            name: p.user.name,
            email: p.user.email,
          })),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creating conversation:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create conversation" },
      { status: 500 }
    )
  }
}
