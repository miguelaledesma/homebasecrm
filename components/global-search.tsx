"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Search, User, Phone, Mail, MapPin, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type SearchResult = {
  id: string
  firstName: string
  lastName: string
  phone: string | null
  email: string | null
  addressLine1: string | null
  city: string | null
  state: string | null
  zip: string | null
  mostRecentLead: {
    id: string
    customerNumber: string | null
    status: string
    leadTypes: string[]
    createdAt: string
  } | null
}

type GlobalSearchProps = {
  onResultClick?: () => void
  onClose?: () => void
}

export function GlobalSearch({ onResultClick, onClose }: GlobalSearchProps = {}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const data = await response.json()
          setResults(data.results || [])
        } else {
          setResults([])
        }
      } catch (error) {
        console.error("Error searching:", error)
        setResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose?.()
        inputRef.current?.blur()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  const handleResultClick = (result: SearchResult) => {
    setQuery("")
    setResults([])
    // Call the callback if provided (e.g., to close modal)
    onResultClick?.()
    // Navigate to the most recent lead if available, otherwise we could navigate to a customer page
    if (result.mostRecentLead) {
      router.push(`/leads/${result.mostRecentLead.id}`)
    }
  }

  const formatAddress = (result: SearchResult) => {
    const parts = [
      result.addressLine1,
      result.city,
      result.state,
      result.zip,
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(", ") : null
  }

  return (
    <div className="relative w-full" ref={searchRef}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Search Customers</h2>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Input */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search by name, phone, or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 pr-10 h-12 text-base"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[60vh] overflow-y-auto">
        {query.length >= 2 && !isLoading && results.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No customers found
          </div>
        )}

        {query.length < 2 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Start typing to search for customers...
          </div>
        )}

        {results.length > 0 && (
          <div className="divide-y">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full text-left p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-base">
                      {result.firstName} {result.lastName}
                    </div>
                    {result.mostRecentLead?.customerNumber && (
                      <div className="text-sm text-muted-foreground mt-0.5">
                        Customer #{result.mostRecentLead.customerNumber}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                      {result.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-4 w-4" />
                          <span>{result.phone}</span>
                        </div>
                      )}
                      {result.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4" />
                          <span className="truncate max-w-[300px]">{result.email}</span>
                        </div>
                      )}
                      {formatAddress(result) && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate max-w-[300px]">
                            {formatAddress(result)}
                          </span>
                        </div>
                      )}
                    </div>
                    {result.mostRecentLead && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Latest Lead: </span>
                        <span className="font-medium capitalize">
                          {result.mostRecentLead.status.toLowerCase()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
