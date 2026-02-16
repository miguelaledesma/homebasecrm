"use client"

import { useState, useRef, useEffect } from "react"
import { Send, ArrowLeft, Users, Hash, X, Pencil, Check, Paperclip, FileText, Image as ImageIcon, Film, FileSpreadsheet, File, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

type Participant = {
  id: string
  name: string | null
  email: string
}

type Attachment = {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string
  downloadUrl?: string
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
  attachments?: Attachment[]
}

type MessagesThreadProps = {
  conversationId: string
  conversationName: string
  conversationType: "DIRECT" | "GROUP"
  participants: Participant[]
  messages: Message[]
  currentUserId: string
  onSendMessage: (content: string, files?: File[]) => void
  onBack: () => void
  onRenameConversation?: (name: string) => void
  onDeleteConversation?: () => void
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

function getFileIcon(fileType: string) {
  if (fileType.startsWith("image/")) return <ImageIcon className="h-4 w-4" />
  if (fileType.startsWith("video/")) return <Film className="h-4 w-4" />
  if (fileType.includes("pdf")) return <FileText className="h-4 w-4" />
  if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv"))
    return <FileSpreadsheet className="h-4 w-4" />
  if (fileType.includes("word") || fileType.includes("document"))
    return <FileText className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImageType(fileType: string): boolean {
  return fileType.startsWith("image/")
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
  onDeleteConversation,
  loading,
  sending,
}: MessagesThreadProps) {
  const [input, setInput] = useState("")
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(conversationName)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if ((!input.trim() && pendingFiles.length === 0) || sending) return
    
    // Validate content length (max 5000 chars)
    const trimmedInput = input.trim()
    if (trimmedInput.length > 5000) {
      alert("Message content cannot exceed 5000 characters")
      return
    }
    
    onSendMessage(trimmedInput, pendingFiles.length > 0 ? pendingFiles : undefined)
    setInput("")
    setPendingFiles([])
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ""
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Limit to 5 total files
    const remaining = 5 - pendingFiles.length
    const newFiles = files.slice(0, remaining)

    // Validate files before adding
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
    const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif", "webp", "txt", "csv", "mp4", "mov"]
    
    const validFiles: File[] = []
    const errors: string[] = []

    for (const file of newFiles) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds 10MB limit`)
        continue
      }

      if (file.size === 0) {
        errors.push(`${file.name} is empty`)
        continue
      }

      // Check file extension
      const extension = file.name.split(".").pop()?.toLowerCase()
      if (!extension || !ALLOWED_EXTENSIONS.includes(extension)) {
        errors.push(`${file.name} is not an allowed file type`)
        continue
      }

      // Check file name
      if (!file.name || file.name.length === 0 || file.name.length > 255) {
        errors.push(`${file.name} has an invalid name`)
        continue
      }

      // Check for path traversal
      if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
        errors.push(`${file.name} has an invalid name`)
        continue
      }

      validFiles.push(file)
    }

    // Show errors if any
    if (errors.length > 0) {
      alert(`Some files were rejected:\n${errors.join("\n")}`)
    }

    if (validFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...validFiles])
    }

    // Reset the file input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
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
              setShowDeleteConfirm(false)
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
              setShowDeleteConfirm(false)
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
              <div className="p-4 border-b">
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

              {/* Delete Conversation Section */}
              {onDeleteConversation && (
                <div className="p-4">
                  <div className="border-t pt-4">
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleting}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-destructive/50 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="text-sm font-medium">Delete Conversation</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setShowDeleteConfirm(false)}
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
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      await onDeleteConversation?.()
                      setShowDeleteConfirm(false)
                      setDetailsOpen(false)
                    } catch (error) {
                      console.error("Error deleting conversation:", error)
                      alert("Failed to delete conversation. Please try again.")
                    } finally {
                      setDeleting(false)
                    }
                  }}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 text-sm bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
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
                      {/* Message text (hide if it's just the auto-generated attachment label) */}
                      {message.content && !(message.attachments && message.attachments.length > 0 && message.content.startsWith("📎")) && (
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                      )}

                      {/* Attachments */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {message.attachments.map((att) => (
                            <div key={att.id}>
                              {isImageType(att.fileType) && att.downloadUrl ? (
                                <a
                                  href={att.downloadUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-lg overflow-hidden border hover:border-blue-400 transition-colors max-w-[280px]"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={att.downloadUrl}
                                    alt={att.fileName}
                                    className="max-h-[200px] object-contain bg-muted/30"
                                  />
                                  <div className="px-2 py-1.5 text-[11px] text-muted-foreground truncate bg-muted/20">
                                    {att.fileName}
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={att.downloadUrl || att.filePath}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download={att.fileName}
                                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg border hover:border-blue-400 hover:bg-muted/50 transition-colors max-w-[280px] group/file"
                                >
                                  <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-muted-foreground">
                                    {getFileIcon(att.fileType)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{att.fileName}</p>
                                    <p className="text-[11px] text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                                  </div>
                                  <Download className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover/file:opacity-100 transition-opacity flex-shrink-0" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
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
        {/* Pending file previews */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 px-1">
            {pendingFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border bg-muted/30 text-sm max-w-[200px] group/pending"
              >
                <div className="text-muted-foreground flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>
                <span className="truncate text-xs">{file.name}</span>
                <button
                  onClick={() => removePendingFile(index)}
                  className="h-4 w-4 flex items-center justify-center rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 border rounded-lg bg-muted/30 p-2 focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent transition-all">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.txt,.csv,.mp4,.mov"
            onChange={handleFileSelect}
          />

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={pendingFiles.length >= 5 || sending}
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Attach files (max 5)"
          >
            <Paperclip className="h-4 w-4" />
          </button>

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
            disabled={(!input.trim() && pendingFiles.length === 0) || sending}
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
