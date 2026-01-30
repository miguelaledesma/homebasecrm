"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Bell, MessageSquare, AlertCircle, X, Check, UserPlus, Calendar } from "lucide-react"
import Link from "next/link"

type Notification = {
  id: string
  type: "LEAD_INACTIVITY" | "ADMIN_COMMENT" | "CONCIERGE_LEAD" | "CALENDAR_TASK"
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

type NotificationsListProps = {
  notifications: Notification[]
  onAcknowledge: (id: string) => Promise<void>
  onMarkAsRead: (id: string) => Promise<void>
  pastDueAppointmentsCount?: number
}

export function NotificationsList({
  notifications,
  onAcknowledge,
  onMarkAsRead,
  pastDueAppointmentsCount = 0,
}: NotificationsListProps) {
  const router = useRouter()

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      await onMarkAsRead(notification.id)
    }

    // For ADMIN_COMMENT notifications, auto-acknowledge when clicked (they'll be deleted)
    if (notification.type === "ADMIN_COMMENT" && !notification.acknowledged) {
      await onAcknowledge(notification.id)
    }

    // Navigate based on notification type
    if (notification.type === "CALENDAR_TASK") {
      router.push("/tasks")
    } else if (notification.lead) {
      router.push(`/leads/${notification.lead.id}`)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "LEAD_INACTIVITY":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "ADMIN_COMMENT":
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case "CONCIERGE_LEAD":
        return <UserPlus className="h-4 w-4 text-green-500" />
      case "CALENDAR_TASK":
        return <Calendar className="h-4 w-4 text-purple-500" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationMessage = (notification: Notification) => {
    if (notification.type === "LEAD_INACTIVITY") {
      const customerName = notification.lead
        ? `${notification.lead.customer.firstName} ${notification.lead.customer.lastName}`
        : "a lead"
      return `No activity on ${customerName} for 48+ hours`
    } else if (notification.type === "ADMIN_COMMENT") {
      const adminName =
        notification.note?.createdByUser?.name ||
        notification.note?.createdByUser?.email ||
        "Deleted User"
      return `${adminName} commented on your lead`
    } else if (notification.type === "CONCIERGE_LEAD") {
      const customerName = notification.lead
        ? `${notification.lead.customer.firstName} ${notification.lead.customer.lastName}`
        : "a new lead"
      const conciergeName =
        notification.lead?.createdByUser?.name ||
        notification.lead?.createdByUser?.email ||
        "Deleted User"
      return `New lead from ${conciergeName}: ${customerName}`
    } else if (notification.type === "CALENDAR_TASK") {
      return "You have been assigned a calendar task"
    }
    return "New notification"
  }

  // Acknowledged notifications are automatically deleted, so all notifications here are unacknowledged
  // No need to filter - just display all notifications
  const unacknowledged = notifications
  const acknowledged: Notification[] = [] // Empty since acknowledged notifications are deleted

  return (
    <div className="max-h-96 overflow-y-auto">
      {notifications.length === 0 && pastDueAppointmentsCount === 0 ? (
        <div className="p-4 text-center text-sm text-muted-foreground">
          No notifications
        </div>
      ) : notifications.length > 0 ? (
        <div className="p-2">
          {unacknowledged.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 border-b hover:bg-accent cursor-pointer ${
                !notification.read ? "bg-blue-50 dark:bg-blue-950/20" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {getNotificationMessage(notification)}
                  </div>
                  {notification.note && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.note.content}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2"
                    onClick={async (e) => {
                      e.stopPropagation()
                      await onAcknowledge(notification.id)
                    }}
                    title="Acknowledge"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

