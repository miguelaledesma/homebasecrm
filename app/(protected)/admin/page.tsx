"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type UserRole = "ADMIN" | "SALES_REP"

interface Invitation {
  id: string
  email: string
  role: UserRole
  expiresAt: string
  invitationUrl: string
}

interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  createdAt: string
}

export default function AdminPage() {
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<UserRole>("SALES_REP")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [invitationUrl, setInvitationUrl] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string; name: string | null } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setInvitationUrl("")
    setLoading(true)

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, name: name || undefined }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create invitation")
      }

      setSuccess("Invitation created successfully!")
      setInvitationUrl(data.invitation.invitationUrl)
      setEmail("")
      setName("")
      setRole("SALES_REP")
      handleInvitationSuccess()
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (invitationUrl) {
      navigator.clipboard.writeText(invitationUrl)
      alert("Invitation link copied to clipboard!")
    }
  }

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await fetch("/api/users?all=true")
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error("Error fetching users:", err)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setDeletingUserId(userToDelete.id)
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete user")
      }

      setSuccess("User deleted successfully!")
      setError("")
      setUserToDelete(null)
      // Refresh users list
      fetchUsers()
    } catch (err: any) {
      setError(err.message || "Failed to delete user")
      setSuccess("")
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleInvitationSuccess = () => {
    // Refresh users list after successful invitation
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="text-muted-foreground mt-2">
          Create new user accounts by sending invitation links
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite New User</CardTitle>
          <CardDescription>
            Create an invitation link to send to a new user. They will be able to
            create their account and set a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <Label htmlFor="name">Name (Optional)</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                required
              >
                <option value="SALES_REP">Sales Person</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 p-3 rounded-md">
                {success}
              </div>
            )}

            {invitationUrl && (
              <div className="space-y-2">
                <Label>Invitation Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={invitationUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with the user. It will expire in 7 days.
                </p>
              </div>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Creating invitation..." : "Create Invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage all users in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingUsers ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users found</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {user.name || "No name"}
                      </p>
                      <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                        {user.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {user.id !== session?.user?.id && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setUserToDelete({ id: user.id, email: user.email, name: user.name })}
                      disabled={deletingUserId === user.id}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user{" "}
              <strong>{userToDelete?.name || userToDelete?.email}</strong> ({userToDelete?.email})?
              <br />
              <br />
              <strong className="text-destructive">This action cannot be undone.</strong> All leads assigned to this user will be unassigned, and all associated appointments, quotes, and notes will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingUserId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={!!deletingUserId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUserId ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

