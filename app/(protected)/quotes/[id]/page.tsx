"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ArrowLeft, DollarSign, FileText, Upload, Send, Download, Trash2, Edit2, Save, X, User } from "lucide-react"
import { QuoteStatus } from "@prisma/client"
import { formatLeadTypes } from "@/lib/utils"

type Quote = {
  id: string
  amount: number
  currency: string
  status: QuoteStatus
  sentAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  lead: {
    id: string
    leadTypes: string[]
    customer: {
      id: string
      firstName: string
      lastName: string
    }
  }
  appointment: {
    id: string
    scheduledFor: string
  } | null
  salesRep: {
    id: string
    name: string | null
    email: string
  }
  files: Array<{
    id: string
    fileUrl: string
    fileType: string | null
    uploadedAt: string
    uploadedBy: {
      id: string
      name: string | null
      email: string
    }
  }>
}

export default function QuoteDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [status, setStatus] = useState<QuoteStatus>("DRAFT")
  const [amount, setAmount] = useState<string>("")
  const [expiresAt, setExpiresAt] = useState<string>("")
  const [originalAmount, setOriginalAmount] = useState<string>("")
  const [originalExpiresAt, setOriginalExpiresAt] = useState<string>("")
  const [originalStatus, setOriginalStatus] = useState<QuoteStatus>("DRAFT")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const quoteId = params.id as string

  const fetchQuote = useCallback(async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/quotes")
          return
        }
        throw new Error("Failed to fetch quote")
      }
      const data = await response.json()
      setQuote(data.quote)
      setStatus(data.quote.status)
      setOriginalStatus(data.quote.status)
      setAmount(data.quote.amount.toString())
      setOriginalAmount(data.quote.amount.toString())
      const expiresAtValue = data.quote.expiresAt
        ? new Date(data.quote.expiresAt).toISOString().slice(0, 16)
        : ""
      setExpiresAt(expiresAtValue)
      setOriginalExpiresAt(expiresAtValue)
    } catch (error) {
      console.error("Error fetching quote:", error)
    } finally {
      setLoading(false)
    }
  }, [quoteId, router])

  useEffect(() => {
    if (quoteId) {
      fetchQuote()
    }
  }, [quoteId, fetchQuote])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`/api/quotes/${quoteId}/files`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to upload file")
      }

      fetchQuote()
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      alert(error.message || "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleSendQuote = async () => {
    if (!confirm("Are you sure you want to send this quote? This will mark it as sent.")) {
      return
    }

    setSending(true)
    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, {
        method: "POST",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to send quote")
      }

      fetchQuote()
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Failed to send quote")
    } finally {
      setSending(false)
    }
  }

  const handleStartEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setAmount(originalAmount)
    setExpiresAt(originalExpiresAt)
    setStatus(originalStatus)
  }

  const handleSaveChanges = async () => {
    if (!quote) return

    const newAmount = parseFloat(amount)
    if (isNaN(newAmount) || newAmount <= 0) {
      alert("Please enter a valid amount")
      return
    }

    setUpdating(true)
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: newAmount,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          status: status,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to update quote")
      }

      setIsEditing(false)
      fetchQuote()
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Failed to update quote")
    } finally {
      setUpdating(false)
    }
  }

  const handleStatusUpdate = async (newStatus: QuoteStatus) => {
    if (!isEditing) {
      // If not in edit mode, update immediately (for non-admin users)
      try {
        const response = await fetch(`/api/quotes/${quoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to update quote")
        }

        fetchQuote()
        router.refresh()
      } catch (error: any) {
        alert(error.message || "Failed to update quote")
      }
    } else {
      // If in edit mode, just update local state
      setStatus(newStatus)
    }
  }

  const handleDeleteQuote = async () => {
    if (!quote) return
    
    setDeleting(true)
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to delete quote")
      }

      router.push(`/leads/${quote.lead.id}`)
    } catch (error: any) {
      alert(error.message || "Failed to delete quote")
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!quote) {
    return <div className="text-center py-8">Quote not found</div>
  }

  const canEdit = session?.user.role === "ADMIN"
  const canDelete = session?.user.role === "ADMIN"
  const canUpdateStatus = canEdit || quote.salesRep.id === session?.user.id
  // Upload permissions: ADMIN can upload to any quote, SALES_REP can upload to their own quotes
  const canUpload = session?.user.role === "ADMIN" || quote.salesRep.id === session?.user.id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/leads/${quote.lead.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Quote Details</h1>
            <p className="text-muted-foreground">
              {quote.lead.customer.firstName} {quote.lead.customer.lastName} - {formatLeadTypes(quote.lead.leadTypes || [])}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/leads/${quote.lead.id}`}>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              View Lead
            </Button>
          </Link>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Deleting..." : "Delete Quote"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the quote
                    for {quote.lead.customer.firstName} {quote.lead.customer.lastName} 
                    ({new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: quote.currency,
                    }).format(quote.amount)}).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteQuote}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quote Information</CardTitle>
              {canEdit && !isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartEdit}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {canEdit && isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={updating}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={updating}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updating ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
                Amount
              </Label>
              {canEdit && isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-semibold">{quote.currency}</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={updating}
                    className="text-2xl font-bold"
                  />
                </div>
              ) : (
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: quote.currency,
                  }).format(quote.amount)}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
              <Select
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value as QuoteStatus
                  setStatus(newStatus)
                  handleStatusUpdate(newStatus)
                }}
                disabled={!canUpdateStatus || (isEditing && !canEdit)}
              >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="DECLINED">Declined</option>
                <option value="EXPIRED">Expired</option>
              </Select>
            </div>

            {quote.appointment && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Related Appointment</p>
                <p className="text-sm">
                  {new Date(quote.appointment.scheduledFor).toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">Sales Rep</p>
              <p className="text-sm">{quote.salesRep.name || quote.salesRep.email}</p>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">
                  {new Date(quote.createdAt).toLocaleString()}
                </p>
              </div>
              {quote.sentAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sent</p>
                  <p className="text-sm">
                    {new Date(quote.sentAt).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="expiresAt" className="text-sm font-medium text-muted-foreground">
                  Expires
                </Label>
                {canEdit && isEditing ? (
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    disabled={updating}
                    className="mt-1"
                  />
                ) : quote.expiresAt ? (
                  <p className="text-sm">
                    {new Date(quote.expiresAt).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No expiration date</p>
                )}
              </div>
            </div>

            {quote.status === "DRAFT" && canEdit && (
              <Button
                onClick={handleSendQuote}
                disabled={sending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send Quote"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Files Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Files</CardTitle>
                <CardDescription>Upload and manage quote files</CardDescription>
              </div>
              {canUpload && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />

            {quote.files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No files uploaded yet.
                {canUpload && " Upload a file to get started."}
              </div>
            ) : (
              <div className="space-y-3">
                {quote.files.map((file) => {
                  // Extract filename from fileUrl (could be a path or data URL)
                  const getFileName = () => {
                    if (file.fileUrl.startsWith("data:")) {
                      return "Uploaded file"
                    }
                    // Extract filename from path like "quotes/123/timestamp-filename.pdf"
                    const parts = file.fileUrl.split("/")
                    const filename = parts[parts.length - 1]
                    // Remove timestamp prefix if present (format: timestamp-filename)
                    const match = filename.match(/^\d+-(.+)$/)
                    return match ? match[1] : filename
                  }

                  const fileName = getFileName()
                  // Check if user can delete this file (ADMIN or file uploader)
                  const canDeleteFile =
                    session?.user.role === "ADMIN" ||
                    file.uploadedBy.id === session?.user.id

                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileType && (
                              <span className="uppercase">{file.fileType}</span>
                            )}
                            {" • "}
                            Uploaded {new Date(file.uploadedAt).toLocaleString()}
                            {file.uploadedBy.name && (
                              <> by {file.uploadedBy.name}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(file.fileUrl, "_blank")}
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canDeleteFile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (
                                !confirm(
                                  "Are you sure you want to delete this file?"
                                )
                              ) {
                                return
                              }

                              try {
                                const response = await fetch(
                                  `/api/quotes/${quoteId}/files/${file.id}`,
                                  {
                                    method: "DELETE",
                                  }
                                )

                                if (!response.ok) {
                                  const data = await response.json()
                                  throw new Error(data.error || "Failed to delete file")
                                }

                                fetchQuote()
                              } catch (error: any) {
                                alert(error.message || "Failed to delete file")
                              }
                            }}
                            title="Delete file"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

