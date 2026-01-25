"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DollarSign,
  FileText,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { QuoteStatus } from "@prisma/client"
import { formatLeadTypes } from "@/lib/utils"

type Quote = {
  id: string
  quoteNumber: string | null
  amount: number
  currency: string
  status: QuoteStatus
  sentAt: string | null
  expiresAt: string | null
  createdAt: string
  lead: {
    id: string
    leadTypes: string[]
    jobStatus?: string | null
    customer: {
      id: string
      firstName: string
      lastName: string
    }
  }
  files: Array<{
    id: string
  }>
  hasProfitLossFile?: boolean // Indicates if P&L file exists
  salesRep?: {
    id: string
    name: string | null
    email: string
  }
}

type PaginationInfo = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function QuotesPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  
  // Initialize filter from URL query parameters
  const getInitialStatusFilter = () => {
    const statusParam = searchParams.get("status")
    if (statusParam && ["DRAFT", "SENT", "ACCEPTED", "DECLINED", "EXPIRED"].includes(statusParam)) {
      return statusParam
    }
    return "all"
  }
  
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>(getInitialStatusFilter())
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      params.append("page", page.toString())
      params.append("limit", "20")

      const response = await fetch(`/api/quotes?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch quotes")

      const data = await response.json()
      setQuotes(data.quotes || [])
      setPagination(data.pagination || null)
    } catch (error) {
      console.error("Error fetching quotes:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter])

  const getStatusBadgeVariant = (status: QuoteStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "DRAFT":
        return "outline"
      case "SENT":
        return "default"
      case "ACCEPTED":
        return "default"
      case "DECLINED":
        return "destructive"
      case "EXPIRED":
        return "secondary"
      default:
        return "outline"
    }
  }

  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      case "SENT":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "ACCEPTED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "DECLINED":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "EXPIRED":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financials & Quotes</h1>
          <p className="text-muted-foreground mt-1">
            {pagination ? `Total: ${pagination.total} quote${pagination.total !== 1 ? "s" : ""}` : "Manage your quotes"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 sm:p-4 border rounded-lg bg-muted/30 w-full max-w-full">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground">
          <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
          <span>Filters:</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:max-w-[200px] text-sm [touch-action:manipulation] min-h-[44px] sm:min-h-0"
          >
            <option value="all">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="DECLINED">Declined</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        </div>
      </div>

      {/* Quotes List */}
      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Loading quotes...</p>
          </CardContent>
        </Card>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No quotes found</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "Get started by creating a quote for a lead."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4">
            {quotes.map((quote) => (
              <Link key={quote.id} href={`/quotes/${quote.id}`}>
                <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-transparent hover:border-l-primary">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left Section - Main Info */}
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <DollarSign className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
                              <h3 className="text-xl font-semibold">
                                {new Intl.NumberFormat("en-US", {
                                  style: "currency",
                                  currency: quote.currency,
                                }).format(quote.amount)}
                              </h3>
                              {quote.quoteNumber && (
                                <span className="text-sm text-muted-foreground font-mono">
                                  #{quote.quoteNumber}
                                </span>
                              )}
                              <Badge
                                variant={getStatusBadgeVariant(quote.status)}
                                className={getStatusColor(quote.status)}
                              >
                                {quote.status}
                              </Badge>
                              {/* Show Needs Financials badge for ACCEPTED quotes with DONE job status but no P&L file */}
                              {quote.status === "ACCEPTED" &&
                                quote.lead.jobStatus === "DONE" &&
                                !quote.hasProfitLossFile &&
                                session?.user.role === "ADMIN" && (
                                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Needs Financials
                                  </Badge>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <Link
                                href={`/leads/${quote.lead.id}`}
                                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <User className="h-4 w-4" />
                                <span className="font-medium">
                                  {quote.lead.customer.firstName}{" "}
                                  {quote.lead.customer.lastName}
                                </span>
                              </Link>
                              <span className="text-xs">•</span>
                              <span className="text-xs">
                                {formatLeadTypes(quote.lead.leadTypes || [])}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Section - Metadata */}
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:items-end lg:text-right">
                        <div className="space-y-2 text-sm">
                          {quote.createdAt && (
                            <div className="flex items-center gap-1.5 lg:justify-end text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Created {formatDate(quote.createdAt)}</span>
                            </div>
                          )}
                          {quote.sentAt && (
                            <div className="flex items-center gap-1.5 lg:justify-end text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Sent {formatDate(quote.sentAt)}</span>
                            </div>
                          )}
                          {quote.expiresAt && (
                            <div
                              className={`flex items-center gap-1.5 lg:justify-end ${
                                isExpired(quote.expiresAt)
                                  ? "text-red-600 dark:text-red-400 font-medium"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {isExpired(quote.expiresAt) ? "Expired " : "Expires "}
                                {formatDate(quote.expiresAt)}
                              </span>
                            </div>
                          )}
                        </div>
                        {quote.files.length > 0 && (
                          <div className="flex items-center gap-1.5 lg:justify-end text-sm text-muted-foreground">
                            <FileText className="h-4 w-4" />
                            <span>
                              {quote.files.length} file{quote.files.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total} quotes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-2">Previous</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum: number
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (page <= 3) {
                          pageNum = i + 1
                        } else if (page >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i
                        } else {
                          pageNum = page - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            disabled={loading}
                            className="min-w-[2.5rem]"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(pagination.totalPages, p + 1))
                      }
                      disabled={page === pagination.totalPages || loading}
                    >
                      <span className="sr-only sm:not-sr-only sm:mr-2">Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
