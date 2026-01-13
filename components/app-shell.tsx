"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { NotificationsList } from "@/components/notifications-list"
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  CheckSquare,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  AlertTriangle,
  Briefcase,
} from "lucide-react"

const navigation: Array<{
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}> = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Appointments", href: "/appointments", icon: Calendar },
  { name: "Quotes", href: "/quotes", icon: FileText },
  // { name: "Tasks", href: "/tasks", icon: CheckSquare }, // Hidden for now
  { name: "Jobs", href: "/jobs", icon: Briefcase, adminOnly: true },
  { name: "Won & Lost", href: "/won-lost", icon: TrendingUp },
  { name: "Admin", href: "/admin", icon: Settings },
]

type Notification = {
  id: string
  type: "LEAD_INACTIVITY" | "ADMIN_COMMENT" | "CONCIERGE_LEAD"
  read: boolean
  acknowledged: boolean
  createdAt: string
  lead: {
    id: string
    customer: {
      firstName: string
      lastName: string
    }
    createdByUser: {
      name: string | null
      email: string
      role: string
    } | null
  } | null
  note: {
    id: string
    content: string
    createdByUser: {
      name: string | null
      email: string
    }
  } | null
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0)
  const [pastDueAppointmentsCount, setPastDueAppointmentsCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)

  // Fetch notifications and past-due appointments count
  const fetchNotifications = useCallback(async () => {
    if (!session?.user) return

    try {
      setLoadingNotifications(true)
      const [notificationsResponse, statsResponse] = await Promise.all([
        fetch("/api/notifications?limit=20"),
        fetch("/api/dashboard/stats"),
      ])

      if (!notificationsResponse.ok) throw new Error("Failed to fetch notifications")
      const notificationsData = await notificationsResponse.json()
      setNotifications(notificationsData.notifications || [])
      setUnreadCount(notificationsData.counts?.unread || 0)
      setUnacknowledgedCount(notificationsData.counts?.unacknowledged || 0)

      // Fetch past-due appointments count
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setPastDueAppointmentsCount(statsData.stats?.pastDueAppointments || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoadingNotifications(false)
    }
  }, [session?.user])

  // Poll for notifications when user is active and dropdown is open
  useEffect(() => {
    if (!session?.user) return

    // Fetch immediately when dropdown opens
    if (notificationsOpen) {
      fetchNotifications()
    }

    // Set up polling interval (every 30 seconds when dropdown is open)
    let interval: NodeJS.Timeout | null = null
    if (notificationsOpen) {
      interval = setInterval(fetchNotifications, 30000)
    }

    // Also poll when page is visible (every 60 seconds)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Initial fetch
    fetchNotifications()

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [session?.user, notificationsOpen, fetchNotifications])

  // Handle acknowledge notification
  const handleAcknowledge = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/acknowledge`, {
        method: "PATCH",
      })
      if (!response.ok) throw new Error("Failed to acknowledge notification")
      await fetchNotifications()
    } catch (error) {
      console.error("Error acknowledging notification:", error)
    }
  }

  // Handle mark as read
  const handleMarkAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: "PATCH",
      })
      if (!response.ok) throw new Error("Failed to mark notification as read")
      await fetchNotifications()
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  // Close notifications menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false)
      }
    }

    if (notificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [notificationsOpen])

  // Filter navigation based on user role - only show Admin, Jobs, and Won & Lost for admins
  const filteredNavigation = navigation.filter(
    (item) =>
      (!item.adminOnly && item.name !== "Admin" && item.name !== "Won & Lost") ||
      session?.user?.role === "ADMIN"
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="border-b w-full max-w-full">
        <div className="flex h-16 items-center justify-between px-4 md:px-6 w-full max-w-full">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Logo />
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {session?.user && (
              <>
                <div className="relative hidden md:block" ref={notificationsRef}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="relative"
                    title="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {(unacknowledgedCount > 0 || pastDueAppointmentsCount > 0) && (
                      <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {unacknowledgedCount + pastDueAppointmentsCount > 9
                          ? "9+"
                          : unacknowledgedCount + pastDueAppointmentsCount}
                      </span>
                    )}
                  </Button>
                  {notificationsOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 max-w-sm rounded-md border bg-background shadow-lg z-50">
                      <div className="p-3 md:p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-semibold">Notifications</div>
                          {unacknowledgedCount > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={async () => {
                                // Acknowledge all unacknowledged notifications
                                const unacknowledged = notifications.filter(
                                  (n) => !n.acknowledged
                                )
                                await Promise.all(
                                  unacknowledged.map((n) => handleAcknowledge(n.id))
                                )
                              }}
                            >
                              <span className="hidden sm:inline">Acknowledge All</span>
                              <span className="sm:hidden">All</span>
                            </Button>
                          )}
                        </div>
                      </div>
                      {loadingNotifications ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Loading...
                        </div>
                      ) : (
                        <>
                          {pastDueAppointmentsCount > 0 && (
                            <div className="p-2 border-b">
                              <Link
                                href="/appointments?pastDue=true"
                                onClick={() => setNotificationsOpen(false)}
                                className="flex items-center gap-3 p-3 border rounded-md hover:bg-accent cursor-pointer bg-orange-50 dark:bg-orange-950/20"
                              >
                                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium">
                                    {pastDueAppointmentsCount} Past Due Appointment
                                    {pastDueAppointmentsCount !== 1 ? "s" : ""}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Click to view and update status
                                  </div>
                                </div>
                              </Link>
                            </div>
                          )}
                          <NotificationsList
                            notifications={notifications}
                            onAcknowledge={handleAcknowledge}
                            onMarkAsRead={handleMarkAsRead}
                          />
                        </>
                      )}
                    </div>
                  )}
                </div>
                <span className="hidden md:inline text-sm text-muted-foreground">
                  {session.user.name || session.user.email}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground">
                  {session.user.role}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="hidden md:flex"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  className="md:hidden"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex w-full max-w-full overflow-x-hidden">
        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="fixed left-0 top-16 bottom-0 w-64 bg-background border-r">
              <nav className="p-4 space-y-1">
                {filteredNavigation.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    pathname === item.href || pathname?.startsWith(item.href + "/")
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 border-r min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-1">
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6 w-full min-w-0 max-w-full overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}

