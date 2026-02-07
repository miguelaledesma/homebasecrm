"use client"

import { useState, useEffect } from "react"
import { X, Search, Users, MessageSquare, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

type User = {
  id: string
  name: string | null
  email: string
  role: string
}

type NewConversationDialogProps = {
  open: boolean
  onClose: () => void
  onCreateConversation: (
    participantIds: string[],
    name: string | null,
    type: "DIRECT" | "GROUP"
  ) => void
  currentUserId: string
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

function formatRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Admin"
    case "SALES_REP":
      return "Sales Rep"
    case "CONCIERGE":
      return "Concierge"
    default:
      return role
  }
}

export function NewConversationDialog({
  open,
  onClose,
  onCreateConversation,
  currentUserId,
}: NewConversationDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [groupName, setGroupName] = useState("")
  const [mode, setMode] = useState<"direct" | "group">("direct")

  // Fetch users
  useEffect(() => {
    if (!open) return

    const fetchUsers = async () => {
      setLoading(true)
      try {
        const response = await fetch("/api/users")
        if (response.ok) {
          const data = await response.json()
          // Filter out current user
          setUsers(
            (data.users || []).filter(
              (u: User) => u.id !== currentUserId
            )
          )
        }
      } catch (error) {
        console.error("Error fetching users:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [open, currentUserId])

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSearchQuery("")
      setSelectedUserIds([])
      setGroupName("")
      setMode("direct")
    }
  }, [open])

  if (!open) return null

  const filteredUsers = searchQuery.trim()
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : users

  const toggleUser = (userId: string) => {
    if (mode === "direct") {
      // Direct mode: select single user and create immediately
      onCreateConversation([userId], null, "DIRECT")
      return
    }

    // Group mode: toggle selection
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  const handleCreateGroup = () => {
    if (selectedUserIds.length < 2) return
    onCreateConversation(
      selectedUserIds,
      groupName.trim() || null,
      "GROUP"
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md mx-4 bg-background rounded-lg shadow-xl border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">New Message</h3>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex border-b">
          <button
            onClick={() => {
              setMode("direct")
              setSelectedUserIds([])
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              mode === "direct"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Direct Message
          </button>
          <button
            onClick={() => setMode("group")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              mode === "group"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            Group Chat
          </button>
        </div>

        {/* Group Name Input */}
        {mode === "group" && (
          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="Group name (optional)"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {selectedUserIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedUserIds.length} member
                {selectedUserIds.length !== 1 ? "s" : ""} selected
              </p>
            )}
          </div>
        )}

        {/* Search */}
        <div className="p-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search teammates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-muted/50 focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              autoFocus
            />
          </div>
        </div>

        {/* User List */}
        <div className="max-h-[300px] overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-muted-foreground">
                Loading teammates...
              </span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <span className="text-sm text-muted-foreground">
                No teammates found
              </span>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedUserIds.includes(user.id)
              return (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div
                    className={`h-9 w-9 rounded-md bg-gradient-to-br ${getAvatarColor(
                      user.id
                    )} flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}
                  >
                    {getInitials(user.name, user.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {user.name || user.email}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {formatRole(user.role)}
                      {user.name && ` \u00B7 ${user.email}`}
                    </div>
                  </div>
                  {mode === "group" && isSelected && (
                    <div className="h-5 w-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Group Create Button */}
        {mode === "group" && (
          <div className="p-4 border-t">
            <Button
              onClick={handleCreateGroup}
              disabled={selectedUserIds.length < 2}
              className="w-full"
            >
              Create Group ({selectedUserIds.length} members)
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
