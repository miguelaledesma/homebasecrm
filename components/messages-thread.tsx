"use client"

import { useState, useRef, useEffect } from "react"
import { Send, ArrowLeft, Users, Hash, X, Pencil, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

type Participant = {
  id: string
  name: string | null
  email: string
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

type MessagesThreadProps = {
  conversationId: string
  conversationName: string
  conversationType: "DIRECT" | "GROUP"
  participants: Participant[]
  messages: Message[]
  currentUserId: string
  onSendMessage: (content: string) => void
  onBack: () => void
  onRenameConversation?: (name: string) => void
  loading: boolean
  sending: boolean
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

function formatMessageTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const messageDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )

  if (messageDate.getTime() === today.getTime()) return "Today"
  if (messageDate.getTime() === yesterday.getTime()) return "Yesterday"

  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })
}

function shouldShowDateDivider(
  messages: Message[],
  index: number
): boolean {
  if (index === 0) return true
  const prev = new Date(messages[index - 1].createdAt)
  const curr = new Date(messages[index].createdAt)
  return (
    prev.getFullYear() !== curr.getFullYear() ||
    prev.getMonth() !== curr.getMonth() ||
    prev.getDate() !== curr.getDate()
  )
}

function shouldShowSender(
  messages: Message[],
  index: number
): boolean {
  if (index === 0) return true
  if (shouldShowDateDivider(messages, index)) return true

  const prev = messages[index - 1]
  const curr = messages[index]

  // Show sender if different sender or > 5 minutes gap
  if (prev.senderId !== curr.senderId) return true
  const diffMs =
    new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime()
  return diffMs > 300000
}

export function MessagesThread({
  conversationId,
  conversationName,
  conversationType,
  participants,
  messages,
  currentUserId,
  onSendMessage,
  onBack,
  onRenameConversation,
  loading,
  sending,
}: MessagesThreadProps) {
  const [input, setInput] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(conversationName)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus input when conversation loads
  useEffect(() => {
    inputRef.current?.focus()
  }, [conversationId])

  // Sync name input when conversation changes
  useEffect(() => {
    setNameInput(conversationName)
    setEditingName(false)
    setDetailsOpen(false)
  }, [conversationId, conversationName])

  // Focus name input when editing starts
  useEffect(() => {
    if (editingName) {
      nameInputRef.current?.focus()
      nameInputRef.current?.select()
    }
  }, [editingName])

  const handleSend = () => {
    if (!input.trim() || sending) return
    onSendMessage(input.trim())
    setInput("")
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleSaveName = () => {
    if (nameInput.trim() && nameInput.trim() !== conversationName) {
      onRenameConversation?.(nameInput.trim())
    }
    setEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSaveName()
    }
    if (e.key === "Escape") {
      setNameInput(conversationName)
      setEditingName(false)
    }
  }

  const otherParticipants = participants.filter((p) => p.id !== currentUserId)
  const currentParticipant = participants.find((p) => p.id === currentUserId)

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 bg-background">
        {/* Back button (mobile) */}
        <button
          onClick={onBack}
          className="md:hidden h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Clickable header area to open details */}
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="flex items-center gap-3 flex-1 min-w-0 hover:bg-muted/50 -ml-1 pl-1 pr-2 py-1 rounded-md transition-colors"
        >
          {/* Conversation icon */}
          <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
            {conversationType === "GROUP" ? (
              <Hash className="h-4 w-4 text-muted-foreground" />
            ) : (
              <div
                className={`h-8 w-8 rounded-md bg-gradient-to-br ${getAvatarColor(
                  otherParticipants[0]?.id || ""
                )} flex items-center justify-center text-white text-xs font-medium`}
              >
                {otherParticipants[0]
                  ? getInitials(
                      otherParticipants[0].name,
                      otherParticipants[0].email
                    )
                  : "?"}
              </div>
            )}
          </div>

          {/* Name and participants */}
          <div className="flex-1 min-w-0 text-left">
            <h3 className="text-sm font-semibold truncate">{conversationName}</h3>
            {conversationType === "GROUP" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{participants.length} members</span>
              </div>
            )}
            {conversationType === "DIRECT" && otherParticipants[0] && (
              <p className="text-xs text-muted-foreground truncate">
                {otherParticipants[0].email}
              </p>
            )}
          </div>
        </button>
      </div>

      {/* Details Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setDetailsOpen(false)
              setEditingName(false)
            }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md mx-4 bg-background rounded-lg shadow-xl border overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {conversationType === "GROUP" ? "Group Details" : "Conversation Details"}
              </h3>
              <button
                onClick={() => {
                  setDetailsOpen(false)
                  setEditingName(false)
                }}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {/* Group Name Section (only for groups) */}
              {conversationType === "GROUP" && (
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Group Name
                    </span>
                    {!editingName && (
                      <button
                        onClick={() => setEditingName(true)}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                        title="Edit name"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    )}
                  </div>

                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        className="flex-1 text-sm px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Group name..."
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={!nameInput.trim()}
                        className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setNameInput(conversationName)
                          setEditingName(false)
                        }}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium">{conversationName}</p>
                  )}
                </div>
              )}

              {/* Members Section */}
              <div className="p-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Members ({participants.length})
                </span>

                <div className="mt-3 space-y-1">
                  {/* Current user first */}
                  {currentParticipant && (
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-muted/50">
                      <div
                        className={`h-9 w-9 rounded-md bg-gradient-to-br ${getAvatarColor(
                          currentParticipant.id
                        )} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}
                      >
                        {getInitials(
                          currentParticipant.name,
                          currentParticipant.email
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {currentParticipant.name || currentParticipant.email}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          You
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Other participants */}
                  {otherParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div
                        className={`h-9 w-9 rounded-md bg-gradient-to-br ${getAvatarColor(
                          participant.id
                        )} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}
                      >
                        {getInitials(participant.name, participant.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {participant.name || participant.email}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {participant.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">
              Loading messages...
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messages.map((message, index) => {
              const isOwn = message.senderId === currentUserId
              const showDate = shouldShowDateDivider(messages, index)
              const showSender = shouldShowSender(messages, index)

              return (
                <div key={message.id}>
                  {/* Date Divider */}
                  {showDate && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs font-medium text-muted-foreground px-2">
                        {formatDateDivider(message.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  {/* Message */}
                  <div
                    className={`group flex gap-3 px-2 py-0.5 rounded-md hover:bg-muted/50 transition-colors ${
                      showSender ? "mt-3" : ""
                    }`}
                  >
                    {/* Avatar or spacer */}
                    <div className="w-8 flex-shrink-0">
                      {showSender && (
                        <div
                          className={`h-8 w-8 rounded-md bg-gradient-to-br ${getAvatarColor(
                            message.sender.id
                          )} flex items-center justify-center text-white text-xs font-medium`}
                        >
                          {getInitials(
                            message.sender.name,
                            message.sender.email
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {showSender && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span
                            className={`text-sm font-semibold ${
                              isOwn ? "text-blue-600 dark:text-blue-400" : ""
                            }`}
                          >
                            {isOwn
                              ? "You"
                              : message.sender.name ||
                                message.sender.email}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatMessageTimestamp(message.createdAt)}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                    </div>

                    {/* Hover timestamp for messages without sender header */}
                    {!showSender && (
                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center flex-shrink-0">
                        {formatMessageTimestamp(message.createdAt)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t flex-shrink-0 bg-background">
        <div className="flex items-end gap-2 border rounded-lg bg-muted/30 p-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${conversationName}...`}
            rows={1}
            className="flex-1 bg-transparent border-none outline-none resize-none text-sm min-h-[36px] max-h-[120px] py-1.5 px-2 placeholder:text-muted-foreground"
            style={{
              height: "auto",
              minHeight: "36px",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = `${Math.min(target.scrollHeight, 120)}px`
            }}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="h-9 w-9 p-0 rounded-lg flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-muted text-[10px] font-mono">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  )
}
