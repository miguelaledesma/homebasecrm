"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Shield, AlertCircle } from "lucide-react"
import { UserRole } from "@prisma/client"

type LeadCreationStat = {
  userId: string
  userName: string | null
  userEmail: string
  userRole: UserRole
  leadCount: number
}

export function TeamPerformanceWidget() {
  const [stats, setStats] = useState<LeadCreationStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/analytics/lead-creation")
        if (!response.ok) {
          throw new Error("Failed to fetch lead creation stats")
        }
        const data = await response.json()
        setStats(data.stats || [])
      } catch (err: any) {
        setError(err.message || "Failed to load team performance data")
        console.error("Error fetching lead creation stats:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  // Calculate maximum lead count for proportional bars
  const maxLeadCount = stats.length > 0 ? Math.max(...stats.map((s) => s.leadCount)) : 1

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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Team Performance - Lead Creation
          </CardTitle>
          <CardDescription className="text-sm">
            Tracking which team members are creating leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading team performance data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Team Performance - Lead Creation
          </CardTitle>
          <CardDescription className="text-sm">
            Tracking which team members are creating leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 sm:p-4 rounded-lg">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1 break-words">{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Team Performance - Lead Creation
          </CardTitle>
          <CardDescription className="text-sm">
            Tracking which team members are creating leads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No lead creation data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <User className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          Team Performance - Lead Creation
        </CardTitle>
        <CardDescription className="text-sm">
          Tracking which team members are creating leads
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div 
          className={`space-y-3 ${stats.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2 -mr-2 team-performance-scroll' : ''}`}
          style={stats.length > 5 ? {
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
          } as React.CSSProperties : undefined}
        >
          {stats.map((stat) => {
            const percentage = maxLeadCount > 0 ? (stat.leadCount / maxLeadCount) * 100 : 0
            return (
              <div key={stat.userId} className="space-y-1.5">
                {/* User Info and Count */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                        {getInitials(stat.userName, stat.userEmail)}
                      </div>
                    </div>

                    {/* User Name/Email */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate text-sm">
                          {stat.userName || stat.userEmail}
                        </p>
                        <Badge
                          variant={stat.userRole === "ADMIN" ? "default" : "secondary"}
                          className="text-xs w-fit flex-shrink-0"
                        >
                          {stat.userRole === "ADMIN" ? (
                            <>
                              <Shield className="h-3 w-3 mr-1" />
                              Admin
                            </>
                          ) : stat.userRole === "CONCIERGE" ? (
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
                      {stat.userName && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {stat.userEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Lead Count */}
                  <div className="flex-shrink-0 text-right ml-2">
                    <div className="text-base font-bold">{stat.leadCount}</div>
                    <div className="text-xs text-muted-foreground">leads</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {stats.length > 5 && (
          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
            Showing {stats.length} team member{stats.length !== 1 ? 's' : ''}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
