"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertCircle, Check, X, Clock, User, Trash2 } from "lucide-react"
import { TaskStatus } from "@prisma/client"

type Task = {
  id: string
  type: "LEAD_INACTIVITY"
  status: TaskStatus
  createdAt: string
  acknowledgedAt: string | null
  resolvedAt: string | null
  hoursInactive?: number
  lastActivity?: string | null
  lead: {
    id: string
    customer: {
      firstName: string
      lastName: string
    }
    assignedSalesRep: {
      id: string
      name: string | null
      email: string
    } | null
  }
  user: {
    id: string
    name: string | null
    email: string
  }
}

export default function TasksPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [salesRepFilter, setSalesRepFilter] = useState<string>("all")
  const [salesReps, setSalesReps] = useState<Array<{ id: string; name: string | null; email: string }>>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalTasks, setTotalTasks] = useState(0)
  const tasksPerPage = 20
  const isAdmin = session?.user.role === "ADMIN"

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      // Pagination
      const offset = (currentPage - 1) * tasksPerPage
      params.append("limit", tasksPerPage.toString())
      params.append("offset", offset.toString())
      
      // Only show PENDING tasks (acknowledged tasks are deleted)
      params.append("status", "PENDING")
      
      if (isAdmin && salesRepFilter !== "all") {
        params.append("userId", salesRepFilter)
      }

      const response = await fetch(`/api/tasks?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch tasks")

      const data = await response.json()
      const filteredTasks = data.tasks || []
      
      setTasks(filteredTasks)
      setTotalTasks(data.pagination?.total || 0)
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }, [salesRepFilter, isAdmin, currentPage])

  // Fetch sales reps for admin filter
  useEffect(() => {
    if (isAdmin) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => {
          const reps = (data.users || []).filter(
            (u: any) => u.role === "SALES_REP" || u.role === "CONCIERGE"
          )
          setSalesReps(reps)
        })
        .catch(console.error)
    }
  }, [isAdmin])

  useEffect(() => {
    setCurrentPage(1) // Reset to page 1 when filters change
  }, [salesRepFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleAcknowledge = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/acknowledge`, {
        method: "PATCH",
      })
      if (!response.ok) throw new Error("Failed to acknowledge task")
      await fetchTasks()
    } catch (error) {
      console.error("Error acknowledging task:", error)
      alert("Failed to acknowledge task")
    }
  }


  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      case "ACKNOWLEDGED":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "RESOLVED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }


  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Tasks</h1>
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Tasks</h1>
      </div>


      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        {isAdmin && (
          <div className="w-full sm:w-auto sm:min-w-[150px]">
            <label className="text-sm font-medium mb-1 block">Sales Rep</label>
            <select
              value={salesRepFilter}
              onChange={(e) => setSalesRepFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="all">All</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.name || rep.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No tasks found
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {tasks.map((task) => {
            const customerName = `${task.lead.customer.firstName} ${task.lead.customer.lastName}`
            const hoursInactive = task.hoursInactive ?? 0
            const salesRepName = task.user.name || task.user.email

            return (
              <div
                key={task.id}
                className="border rounded-lg p-3 md:p-4 hover:bg-accent transition-colors"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" />
                      <h3 className="font-semibold text-sm md:text-base break-words">
                        Lead Inactivity: {customerName}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded flex-shrink-0 ${getStatusColor(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </div>

                    <div className="text-xs md:text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                        <span className="break-words">
                          {hoursInactive} hours since last activity
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 md:h-4 md:w-4 flex-shrink-0" />
                          <span className="break-words">Assigned to: {salesRepName}</span>
                        </div>
                      )}
                      <div className="text-xs">
                        Created: {new Date(task.createdAt).toLocaleString()}
                      </div>
                      {task.acknowledgedAt && (
                        <div className="text-xs">
                          Acknowledged:{" "}
                          {new Date(task.acknowledgedAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 md:flex-nowrap md:flex-shrink-0">
                    {task.status === "PENDING" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcknowledge(task.id)}
                        className="flex-1 sm:flex-initial text-xs md:text-sm"
                      >
                        <Check className="h-3 w-3 md:h-4 md:w-4 sm:mr-1" />
                        <span className="hidden sm:inline">Acknowledge</span>
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/leads/${task.lead.id}`)}
                      className="flex-1 sm:flex-initial text-xs md:text-sm"
                    >
                      <span className="sm:hidden">View</span>
                      <span className="hidden sm:inline">View Lead</span>
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
          </div>

          {/* Pagination */}
          {totalTasks > tasksPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * tasksPerPage + 1} to{" "}
                {Math.min(currentPage * tasksPerPage, totalTasks)} of {totalTasks} tasks
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(totalTasks / tasksPerPage) }, (_, i) => i + 1)
                    .filter((page) => {
                      // Show first page, last page, current page, and pages around current
                      const totalPages = Math.ceil(totalTasks / tasksPerPage)
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      )
                    })
                    .map((page, index, array) => {
                      // Add ellipsis if there's a gap
                      const showEllipsisBefore = index > 0 && array[index - 1] !== page - 1
                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsisBefore && (
                            <span className="px-2 text-muted-foreground">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            disabled={loading}
                            className="min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        </div>
                      )
                    })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(Math.ceil(totalTasks / tasksPerPage), p + 1))
                  }
                  disabled={
                    currentPage >= Math.ceil(totalTasks / tasksPerPage) || loading
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
