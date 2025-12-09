"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, FileText } from "lucide-react"
import { QuoteStatus } from "@prisma/client"

type Quote = {
  id: string
  amount: number
  currency: string
  status: QuoteStatus
  sentAt: string | null
  expiresAt: string | null
  createdAt: string
  lead: {
    id: string
    leadType: string
    customer: {
      id: string
      firstName: string
      lastName: string
    }
  }
  files: Array<{
    id: string
  }>
}

export default function QuotesPage() {
  const { data: session } = useSession()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const fetchQuotes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await fetch(`/api/quotes?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch quotes")

      const data = await response.json()
      setQuotes(data.quotes)
    } catch (error) {
      console.error("Error fetching quotes:", error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const getStatusColor = (status: QuoteStatus) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800"
      case "SENT":
        return "bg-blue-100 text-blue-800"
      case "ACCEPTED":
        return "bg-green-100 text-green-800"
      case "DECLINED":
        return "bg-red-100 text-red-800"
      case "EXPIRED":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quotes</h1>
        <p className="text-muted-foreground">Manage your quotes</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
        </CardContent>
      </Card>

      {/* Quotes List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading quotes...
        </div>
      ) : quotes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No quotes found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quotes.map((quote) => (
            <Link key={quote.id} href={`/quotes/${quote.id}`}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <DollarSign className="h-5 w-5 text-muted-foreground" />
                        <Link
                          href={`/quotes/${quote.id}`}
                          className="text-lg font-semibold hover:underline"
                        >
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: quote.currency,
                          }).format(quote.amount)}
                        </Link>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                            quote.status
                          )}`}
                        >
                          {quote.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>
                          <Link
                            href={`/leads/${quote.lead.id}`}
                            className="hover:underline"
                          >
                            {quote.lead.customer.firstName}{" "}
                            {quote.lead.customer.lastName}
                          </Link>
                          <span className="ml-2">({quote.lead.leadType})</span>
                        </div>
                        <div>
                          Created: {new Date(quote.createdAt).toLocaleString()}
                        </div>
                        {quote.sentAt && (
                          <div>
                            Sent: {new Date(quote.sentAt).toLocaleString()}
                          </div>
                        )}
                        {quote.expiresAt && (
                          <div>
                            Expires: {new Date(quote.expiresAt).toLocaleString()}
                          </div>
                        )}
                        {quote.files.length > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <FileText className="h-4 w-4" />
                            <span>{quote.files.length} file(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
