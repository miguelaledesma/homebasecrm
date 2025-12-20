"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type UserRole = "ADMIN" | "SALES_REP"

interface Invitation {
  id: string
  email: string
  role: UserRole
  expiresAt: string
  invitationUrl: string
}

export default function AdminPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<UserRole>("SALES_REP")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [invitationUrl, setInvitationUrl] = useState("")

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
    </div>
  )
}

