"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { MessageSquare } from "lucide-react"
import { MessagesConversationList } from "@/components/messages-conversation-list"
import { MessagesThread } from "@/components/messages-thread"
import { NewConversationDialog } from "@/components/new-conversation-dialog"

type Participant = {
  id: string
  name: string | null
  email: string
}

type Conversation = {
  id: string
  name: string
  type: "DIRECT" | "GROUP"
  unreadCount: number
  lastMessage: {
    id: string
    content: string
    sender: Participant
    createdAt: string
  } | null
  participants: Participant[]
  updatedAt: string
}

type Message = {
  id: string
  content: string
  conversationId: string
  senderId: string
  createdAt: string
  sender: {
    id: string
    name: string | null
    email: string
  }
}

export default function MessagesPage() {
  const { data: session } = useSession()

  // State
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [newChatOpen, setNewChatOpen] = useState(false)
  const [mobileShowThread, setMobileShowThread] = useState(false)

  const currentUserId = session?.user?.id || ""

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!session?.user) return

    try {
      const response = await fetch("/api/messages")
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    } finally {
      setLoadingConversations(false)
    }
  }, [session?.user])

  // Fetch messages for active conversation
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      if (!session?.user) return

      setLoadingMessages(true)
      try {
        const response = await fetch(
          `/api/messages/${conversationId}?limit=100`
        )
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error("Error fetching messages:", error)
      } finally {
        setLoadingMessages(false)
      }
    },
    [session?.user]
  )

  // Mark conversation as read
  const markAsRead = useCallback(
    async (conversationId: string) => {
      if (!session?.user) return

      try {
        await fetch(`/api/messages/${conversationId}/read`, {
          method: "PATCH",
        })
      } catch (error) {
        console.error("Error marking as read:", error)
      }
    },
    [session?.user]
  )

  // Initial fetch
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // Poll for new conversations and messages
  useEffect(() => {
    if (!session?.user) return

    const interval = setInterval(() => {
      fetchConversations()
      if (activeConversationId) {
        fetchMessages(activeConversationId)
      }
    }, 15000) // Poll every 15 seconds

    return () => clearInterval(interval)
  }, [session?.user, activeConversationId, fetchConversations, fetchMessages])

  // Handle selecting a conversation
  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId)
    setMobileShowThread(true)
    await fetchMessages(conversationId)
    await markAsRead(conversationId)

    // Update unread count locally
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    )
  }

  // Handle sending a message
  const handleSendMessage = async (content: string) => {
    if (!activeConversationId || sending) return

    setSending(true)
    try {
      const response = await fetch(
        `/api/messages/${activeConversationId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      )

      if (response.ok) {
        const data = await response.json()

        // Optimistically add message to thread
        setMessages((prev) => [...prev, data.message])

        // Update conversation list (move to top with new last message)
        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id === activeConversationId) {
              return {
                ...c,
                lastMessage: {
                  id: data.message.id,
                  content: data.message.content,
                  sender: data.message.sender,
                  createdAt: data.message.createdAt,
                },
                updatedAt: new Date().toISOString(),
              }
            }
            return c
          })
          // Sort by updatedAt desc
          return updated.sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() -
              new Date(a.updatedAt).getTime()
          )
        })

        // Mark as read
        await markAsRead(activeConversationId)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    } finally {
      setSending(false)
    }
  }

  // Handle creating a new conversation
  const handleCreateConversation = async (
    participantIds: string[],
    name: string | null,
    type: "DIRECT" | "GROUP"
  ) => {
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds, name, type }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewChatOpen(false)

        // Refresh conversations
        await fetchConversations()

        // Open the new conversation
        handleSelectConversation(data.conversation.id)
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  // Handle renaming a conversation
  const handleRenameConversation = async (name: string) => {
    if (!activeConversationId) return

    try {
      const response = await fetch(
        `/api/messages/${activeConversationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        }
      )

      if (response.ok) {
        // Update conversation name locally
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId ? { ...c, name } : c
          )
        )
      }
    } catch (error) {
      console.error("Error renaming conversation:", error)
    }
  }

  // Handle going back from thread (mobile)
  const handleBack = () => {
    setMobileShowThread(false)
    // Refresh conversations to get updated unread counts
    fetchConversations()
  }

  // Get active conversation details
  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  return (
    <div className="flex h-[calc(100vh-7rem)] w-full -m-4 md:-m-6">
      {/* Conversation List - hidden on mobile when thread is showing */}
      <div
        className={`${
          mobileShowThread ? "hidden" : "flex"
        } md:flex w-full md:w-80 lg:w-96 border-r flex-shrink-0`}
      >
        <div className="w-full">
          <MessagesConversationList
            conversations={conversations}
            activeConversationId={activeConversationId}
            currentUserId={currentUserId}
            onSelectConversation={handleSelectConversation}
            onNewChat={() => setNewChatOpen(true)}
            loading={loadingConversations}
          />
        </div>
      </div>

      {/* Message Thread - hidden on mobile when conversation list is showing */}
      <div
        className={`${
          mobileShowThread ? "flex" : "hidden"
        } md:flex flex-1 min-w-0`}
      >
        {activeConversation ? (
          <div className="w-full">
            <MessagesThread
              conversationId={activeConversation.id}
              conversationName={activeConversation.name}
              conversationType={activeConversation.type}
              participants={activeConversation.participants}
              messages={messages}
              currentUserId={currentUserId}
              onSendMessage={handleSendMessage}
              onBack={handleBack}
              onRenameConversation={handleRenameConversation}
              loading={loadingMessages}
              sending={sending}
            />
          </div>
        ) : (
          /* Empty State - Desktop only */
          <div className="hidden md:flex flex-1 items-center justify-center bg-muted/20">
            <div className="text-center max-w-sm">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your Messages</h3>
              <p className="text-sm text-muted-foreground">
                Select a conversation or start a new chat to begin messaging
                your team.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Dialog */}
      <NewConversationDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onCreateConversation={handleCreateConversation}
        currentUserId={currentUserId}
      />
    </div>
  )
}
