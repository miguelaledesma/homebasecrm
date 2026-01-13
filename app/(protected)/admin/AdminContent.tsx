"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  Trash2,
  KeyRound,
  UserPlus,
  Users,
  Mail,
  Copy,
  CheckCircle2,
  XCircle,
  Calendar,
  Shield,
  User,
} from "lucide-react"
import { AdminFollowUps } from "@/components/admin-follow-ups"
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

type UserRole = "ADMIN" | "SALES_REP" | "CONCIERGE"

interface User {
  id: string
  name: string | null
  email: string
  role: UserRole
  createdAt: string
}

export function AdminContent() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("users")
  
  // Invitation state
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<UserRole>("SALES_REP")
  const [invitationLoading, setInvitationLoading] = useState(false)
  const [invitationUrl, setInvitationUrl] = useState("")
  
  // User management state
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string; name: string | null } | null>(null)
  const [resettingUserId, setResettingUserId] = useState<string | null>(null)
  const [resetUrl, setResetUrl] = useState<{ userId: string; url: string; email: string } | null>(null)
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null)
  
  // Messages
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

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

  const handleInvitationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setInvitationUrl("")
    setInvitationLoading(true)

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
      fetchUsers()
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setInvitationLoading(false)
    }
  }

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(type)
    setTimeout(() => setCopiedUrl(null), 2000)
  }

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
      fetchUsers()
    } catch (err: any) {
      setError(err.message || "Failed to delete user")
      setSuccess("")
    } finally {
      setDeletingUserId(null)
    }
  }

  const handleResetPassword = async (userId: string, userEmail: string) => {
    try {
      setResettingUserId(userId)
      setError("")
      setSuccess("")
      setResetUrl(null)

      const response = await fetch("/api/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to create reset token")
      }

      setSuccess(`Password reset link created for ${userEmail}`)
      setResetUrl({
        userId,
        url: data.resetToken.resetUrl,
        email: userEmail,
      })
    } catch (err: any) {
      setError(err.message || "Failed to create reset link")
      setSuccess("")
    } finally {
      setResettingUserId(null)
    }
  }

  const handleRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      setUpdatingRoleUserId(userId)
      setError("")
      setSuccess("")

      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user role")
      }

      setSuccess(`User role updated successfully!`)
      fetchUsers()
    } catch (err: any) {
      setError(err.message || "Failed to update user role")
      setSuccess("")
    } finally {
      setUpdatingRoleUserId(null)
    }
  }

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    }
    return email[0].toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Settings</h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
            Manage users, invitations, and system settings
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 sm:p-4 rounded-lg">
          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1 break-words">{error}</span>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-8 w-8 p-0 [touch-action:manipulation]"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3 sm:p-4 rounded-lg">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1 break-words">{success}</span>
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0 h-8 w-8 p-0 [touch-action:manipulation]"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 gap-1 sm:gap-0 sm:max-w-md">
          <TabsTrigger 
            value="users" 
            className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-1.5 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-all data-[state=active]:shadow-sm"
          >
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Users</span>
          </TabsTrigger>
          <TabsTrigger 
            value="invitations" 
            className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-1.5 px-2 sm:px-3 text-xs sm:text-sm font-medium transition-all data-[state=active]:shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Invitations</span>
            <span className="sm:hidden">Invite</span>
          </TabsTrigger>
          {/* Follow-ups tab hidden for now - see docs/ADMIN_FOLLOWUPS_OPTIMIZATION.md */}
          {/* <TabsTrigger value="followups" className="flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-1.5 text-xs sm:text-sm">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Follow-ups</span>
            <span className="sm:hidden">Follow</span>
          </TabsTrigger> */}
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">User Management</span>
                  </CardTitle>
                  <CardDescription className="mt-1.5 text-sm">
                    View and manage all users in the system
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs sm:text-sm w-fit">
                  {users.length} {users.length === 1 ? "user" : "users"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-muted-foreground">Loading users...</div>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      {/* Avatar and User Info */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm sm:text-base">
                            {getInitials(user.name, user.email)}
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                            <p className="font-medium truncate text-sm sm:text-base">
                              {user.name || "No name"}
                            </p>
                            <Badge
                              variant={user.role === "ADMIN" ? "default" : "secondary"}
                              className="text-xs w-fit"
                            >
                              {user.role === "ADMIN" ? (
                                <>
                                  <Shield className="h-3 w-3 mr-1" />
                                  Admin
                                </>
                              ) : user.role === "CONCIERGE" ? (
                                <>
                                  <User className="h-3 w-3 mr-1" />
                                  Concierge
                                </>
                              ) : (
                                <>
                                  <User className="h-3 w-3 mr-1" />
                                  Sales Rep
                                </>
                              )}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                            Joined {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Role Selector - Only show if not current user */}
                      {user.id !== session?.user?.id && (
                        <div className="flex items-center gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0">
                          <div className="flex-1 sm:flex-initial min-w-[140px]">
                            <Select
                              value={user.role}
                              onChange={(e) => handleRoleUpdate(user.id, e.target.value as UserRole)}
                              disabled={updatingRoleUserId === user.id}
                              className="text-xs sm:text-sm"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="SALES_REP">Sales Rep</option>
                              <option value="CONCIERGE">Concierge</option>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {user.id !== session?.user?.id && (
                        <div className="flex items-center gap-2 flex-shrink-0 sm:ml-auto pt-2 sm:pt-0 border-t sm:border-t-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResetPassword(user.id, user.email)}
                            disabled={resettingUserId === user.id}
                            className="gap-1.5 flex-1 sm:flex-initial [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                            <span className="text-xs sm:text-sm">
                              {resettingUserId === user.id ? "Generating..." : "Reset"}
                            </span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setUserToDelete({
                                id: user.id,
                                email: user.email,
                                name: user.name,
                              })
                            }
                            disabled={deletingUserId === user.id}
                            className="gap-1.5 flex-1 sm:flex-initial [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="text-xs sm:text-sm">Delete</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reset Link Display */}
          {resetUrl && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <KeyRound className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Password Reset Link</span>
                </CardTitle>
                <CardDescription className="text-sm break-words">
                  Share this link with {resetUrl.email} to reset their password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={resetUrl.url}
                    readOnly
                    className="font-mono text-xs sm:text-sm bg-background flex-1 min-w-0"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(resetUrl.url, "reset")}
                    className="gap-2 w-full sm:w-auto [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                  >
                    {copiedUrl === "reset" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>This link expires in 24 hours</span>
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="space-y-4 md:space-y-6 mt-4 md:mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Invite New User
              </CardTitle>
              <CardDescription className="text-sm">
                Create an invitation link to send to a new user. They will be able to
                create their account and set a password.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <form onSubmit={handleInvitationSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="user@example.com"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name (Optional)</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    required
                  >
                    <option value="SALES_REP">Sales Rep</option>
                    <option value="CONCIERGE">Concierge</option>
                    <option value="ADMIN">Admin</option>
                  </Select>
                </div>

                <Button
                  type="submit"
                  disabled={invitationLoading}
                  className="w-full sm:w-auto gap-2 [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="text-sm sm:text-base">
                    {invitationLoading ? "Creating invitation..." : "Create Invitation"}
                  </span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Invitation Link Display */}
          {invitationUrl && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <span className="truncate">Invitation Link Created</span>
                </CardTitle>
                <CardDescription className="text-sm break-words">
                  Share this link with the new user to complete their account setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={invitationUrl}
                    readOnly
                    className="font-mono text-xs sm:text-sm bg-background flex-1 min-w-0"
                  />
                  <Button
                    variant="outline"
                    onClick={() => copyToClipboard(invitationUrl, "invitation")}
                    className="gap-2 w-full sm:w-auto [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                  >
                    {copiedUrl === "invitation" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        <span className="text-xs sm:text-sm">Copy</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  <span>This link expires in 7 days</span>
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Follow-ups Tab - Hidden for now, see docs/ADMIN_FOLLOWUPS_OPTIMIZATION.md */}
        {/* <TabsContent value="followups" className="mt-4 md:mt-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                Follow-up Tracking
              </CardTitle>
              <CardDescription className="text-sm">
                Monitor which sales reps have inactive leads and aren&apos;t following up
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <AdminFollowUps />
            </CardContent>
          </Card>
        </TabsContent> */}
      </Tabs>

      {/* Delete User Dialog */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={(open) => !open && setUserToDelete(null)}
      >
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg sm:text-xl">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-sm break-words">
              Are you sure you want to delete user{" "}
              <strong>{userToDelete?.name || userToDelete?.email}</strong> (
              {userToDelete?.email})?
              <br />
              <br />
              <strong className="text-destructive">This action cannot be undone.</strong>{" "}
              All leads assigned to this user will be unassigned, and all associated
              appointments, quotes, and notes will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel 
              disabled={!!deletingUserId}
              className="w-full sm:w-auto [touch-action:manipulation] min-h-[44px] sm:min-h-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={!!deletingUserId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto touch-manipulation min-h-[44px] sm:min-h-0"
            >
              {deletingUserId ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
