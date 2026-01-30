"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Medal, Award, TrendingUp, Target, AlertCircle } from "lucide-react"

type TeamPerformanceStat = {
  userId: string
  userName: string | null
  userEmail: string
  totalLeads: number
  wonLeads: number
  winRate: number
  appointmentSetLeads: number
  conversionRate: number
  totalAppointments: number
}

export function SalesRepTeamPerformance() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<TeamPerformanceStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/analytics/team-performance")
        if (!response.ok) {
          throw new Error("Failed to fetch team performance stats")
        }
        const data = await response.json()
        setStats(data.stats || [])
      } catch (err: any) {
        setError(err.message || "Failed to load team performance data")
        console.error("Error fetching team performance stats:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

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

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />
      default:
        return null
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <Badge className="bg-yellow-500 text-yellow-950 border-yellow-600 font-bold">
          #1
        </Badge>
      )
    }
    if (rank === 2) {
      return (
        <Badge className="bg-gray-400 text-gray-950 border-gray-500 font-bold">
          #2
        </Badge>
      )
    }
    if (rank === 3) {
      return (
        <Badge className="bg-amber-600 text-amber-950 border-amber-700 font-bold">
          #3
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="text-muted-foreground">
        #{rank}
      </Badge>
    )
  }

  const currentUserStat = stats.find((s) => s.userId === session?.user?.id)
  const currentUserRank = stats.findIndex((s) => s.userId === session?.user?.id) + 1

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Team Leaderboard
          </CardTitle>
          <CardDescription className="text-sm">
            See how you stack up against the team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading leaderboard...</div>
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
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Team Leaderboard
          </CardTitle>
          <CardDescription className="text-sm">
            See how you stack up against the team
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
            <Trophy className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            Team Leaderboard
          </CardTitle>
          <CardDescription className="text-sm">
            See how you stack up against the team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No team performance data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Trophy className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-yellow-500" />
              Team Leaderboard
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              Ranked by wins • See how you stack up
            </CardDescription>
          </div>
          {currentUserRank > 0 && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Your Rank</div>
              <div className="flex items-center justify-end gap-1 text-2xl font-bold text-primary">
                {getRankIcon(currentUserRank)}
                <span>#{currentUserRank}</span>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div
          className={`space-y-3 ${stats.length > 5 ? 'max-h-[500px] overflow-y-auto pr-2 -mr-2' : ''}`}
          style={stats.length > 5 ? {
            scrollbarWidth: 'thin',
            scrollbarColor: 'hsl(var(--muted-foreground) / 0.3) transparent'
          } as React.CSSProperties : undefined}
        >
          {stats.map((stat, index) => {
            const rank = index + 1
            const isCurrentUser = stat.userId === session?.user?.id
            const isTopThree = rank <= 3

            return (
              <div
                key={stat.userId}
                className={`p-3 rounded-lg border transition-all ${
                  isCurrentUser
                    ? "bg-primary/10 border-primary/30 shadow-md ring-2 ring-primary/20"
                    : isTopThree
                    ? "bg-gradient-to-r from-yellow-50/50 to-transparent border-yellow-200/50"
                    : "bg-card border-border hover:bg-accent/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 flex items-center justify-center">
                    {isTopThree ? (
                      <div className="flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                        isCurrentUser
                          ? "bg-primary text-primary-foreground ring-2 ring-primary"
                          : isTopThree
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {getInitials(stat.userName, stat.userEmail)}
                    </div>
                  </div>

                  {/* User Info & Stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p
                        className={`font-semibold truncate ${
                          isCurrentUser ? "text-primary" : ""
                        }`}
                      >
                        {stat.userName || stat.userEmail}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                      </p>
                      {isTopThree && (
                        <Badge
                          variant="outline"
                          className="text-xs border-yellow-300 text-yellow-700"
                        >
                          Top {rank}
                        </Badge>
                      )}
                    </div>

                    {/* Key Metrics */}
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3.5 w-3.5 text-yellow-600" />
                        <span className="text-sm font-bold text-yellow-700">
                          {stat.wonLeads}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">wins</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-sm font-semibold">
                          {stat.winRate}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">win rate</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                        <span className="text-sm font-semibold">
                          {stat.conversionRate}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">conversion</span>
                      </div>
                    </div>
                  </div>

                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    {getRankBadge(rank)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {currentUserStat && currentUserRank > 3 && (
          <div className="mt-4 pt-4 border-t bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Your Performance</p>
                <p className="text-xs text-muted-foreground">
                  {currentUserRank === stats.length
                    ? "Keep pushing! You're improving."
                    : `${stats[currentUserRank - 1].wonLeads - currentUserStat.wonLeads} more wins to reach #${currentUserRank - 1}`}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {currentUserStat.wonLeads}
                </div>
                <div className="text-xs text-muted-foreground">wins</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
