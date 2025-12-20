"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, DollarSign, FileText, Upload, Send, Download } from "lucide-react"
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
  const [status, setStatus] = useState<QuoteStatus>("DRAFT")
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
    } catch (error) {
      console.error("Error fetching quote:", error)
    } finally {
      setLoading(false)
    }
  }, [quoteId])

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

  const handleStatusUpdate = async (newStatus: QuoteStatus) => {
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
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  if (!quote) {
    return <div className="text-center py-8">Quote not found</div>
  }

  const canEdit = session?.user.role === "ADMIN" || quote.salesRep.id === session?.user.id

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Information */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: quote.currency,
                }).format(quote.amount)}
              </p>
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
                disabled={!canEdit}
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
              {quote.expiresAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expires</p>
                  <p className="text-sm">
                    {new Date(quote.expiresAt).toLocaleString()}
                  </p>
                </div>
              )}
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
              {canEdit && (
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
                {canEdit && " Upload a file to get started."}
              </div>
            ) : (
              <div className="space-y-3">
                {quote.files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {file.fileType || "File"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded {new Date(file.uploadedAt).toLocaleString()}
                          {file.uploadedBy.name && (
                            <> by {file.uploadedBy.name}</>
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(file.fileUrl, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

