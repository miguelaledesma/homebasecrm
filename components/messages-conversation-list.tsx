"use client"

import { Search, Plus, MoreVertical, Trash2 } from "lucide-react"
import { useState, useRef, useEffect } from "react"

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

type MessagesConversationListProps = {
  conversations: Conversation[]
  activeConversationId: string | null
  currentUserId: string
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation?: (id: string) => void
  loading: boolean
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ")
    return parts
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  return email[0].toUpperCase()
}

function getAvatarColor(id: string): string {
  const colors = [
    "from-blue-500 to-blue-600",
    "from-purple-500 to-purple-600",
    "from-green-500 to-green-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
    "from-teal-500 to-teal-600",
    "from-indigo-500 to-indigo-600",
    "from-rose-500 to-rose-600",
    "from-cyan-500 to-cyan-600",
  ]
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHrs = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return "now"
  if (diffMin < 60) return `${diffMin}m`
  if (diffHrs < 24) return `${diffHrs}h`
  if (diffDays < 7) return `${diffDays}d`

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function MessagesConversationList({
  conversations,
  activeConversationId,
  currentUserId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  loading,
}: MessagesConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const menuElement = menuRefs.current[openMenuId]
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null)
        }
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [openMenuId])

  const filtered = searchQuery.trim()
    ? conversations.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Messages</h2>
          <button
            onClick={onNewChat}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
            title="New message"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-muted-foreground">Loading...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            {searchQuery ? (
              <>
                <p className="text-sm text-muted-foreground">
                  No conversations match &quot;{searchQuery}&quot;
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground">
                  Start a new chat to get going
                </p>
              </>
            )}
          </div>
        ) : (
          filtered.map((conversation) => {
            const isActive = conversation.id === activeConversationId
            const hasUnread = conversation.unreadCount > 0
            const displayParticipant = conversation.participants.find(
              (p) => p.id !== currentUserId
            )

            return (
              <div
                key={conversation.id}
                className={`group relative w-full flex items-center gap-3 px-4 py-3 transition-colors border-b border-border/40 ${
                  isActive ? "bg-accent" : "hover:bg-muted/50"
                } ${hasUnread ? "font-medium" : ""}`}
              >
                <button
                  onClick={() => onSelectConversation(conversation.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                {/* Avatar */}
                <div
                  className={`h-10 w-10 rounded-md bg-gradient-to-br ${getAvatarColor(
                    conversation.type === "DIRECT" && displayParticipant
                      ? displayParticipant.id
                      : conversation.id
                  )} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}
                >
                  {conversation.type === "DIRECT" && displayParticipant
                    ? getInitials(displayParticipant.name, displayParticipant.email)
                    : conversation.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span
                      className={`text-sm truncate ${
                        hasUnread ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {conversation.name}
                    </span>
                    {conversation.lastMessage && (
                      <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                        {formatMessageTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage ? (
                    <p
                      className={`text-xs truncate ${
                        hasUnread
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {conversation.lastMessage.sender.id === currentUserId
                        ? "You: "
                        : conversation.type === "GROUP"
                        ? `${conversation.lastMessage.sender.name || "Someone"}: `
                        : ""}
                      {conversation.lastMessage.content}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      No messages yet
                    </p>
                  )}
                </div>

                {/* Unread Badge */}
                {hasUnread && (
                  <div className="h-5 min-w-[20px] rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center px-1.5 flex-shrink-0">
                    {conversation.unreadCount > 9
                      ? "9+"
                      : conversation.unreadCount}
                  </div>
                )}
                </button>

                {/* Actions Menu (three-dot menu) */}
                {onDeleteConversation && (
                  <div className="relative flex-shrink-0" ref={(el) => { menuRefs.current[conversation.id] = el }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setOpenMenuId(openMenuId === conversation.id ? null : conversation.id)
                      }}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                      title="More options"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* Dropdown Menu */}
                    {openMenuId === conversation.id && (
                      <div className="absolute right-0 top-8 z-50 w-48 bg-background border rounded-md shadow-lg py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(null)
                            setShowDeleteConfirm(conversation.id)
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Conversation</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(null)}
          />

          {/* Confirmation Modal */}
          <div className="relative w-full max-w-sm mx-4 bg-background rounded-lg shadow-xl border overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-2">Delete Conversation</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete this conversation? This action cannot be undone and will permanently delete all messages and attachments.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (showDeleteConfirm && onDeleteConversation) {
                      try {
                        await onDeleteConversation(showDeleteConfirm)
                        setShowDeleteConfirm(null)
                      } catch (error) {
                        console.error("Error deleting conversation:", error)
                        alert("Failed to delete conversation. Please try again.")
                      }
                    }
                  }}
                  className="flex-1 px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
