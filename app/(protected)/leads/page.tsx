"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, AlertCircle, Bell, X } from "lucide-react";
import { LeadStatus } from "@prisma/client";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  formatLeadTypes,
  formatLeadType,
  formatPhoneNumber,
} from "@/lib/utils";

type Lead = {
  id: string;
  customerNumber?: string | null;
  leadTypes: string[];
  description: string | null;
  status: LeadStatus;
  assignedSalesRepId: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  assignedSalesRep: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  isInactive?: boolean;
  hoursSinceActivity?: number | null;
  lastActivityTimestamp?: string | null;
  needsFollowUp?: boolean;
};

type ViewMode = "my" | "all" | "unassigned";

export default function LeadsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const isSalesRep =
    session?.user.role === "SALES_REP" || session?.user.role === "CONCIERGE";
  const isAdmin = session?.user.role === "ADMIN";
  const isConcierge = session?.user.role === "CONCIERGE";

  // Initialize viewMode from URL params, localStorage, or default based on role
  const getInitialViewMode = (): ViewMode => {
    if (typeof window !== "undefined") {
      // First check URL params
      const urlParams = new URLSearchParams(window.location.search);
      const urlViewMode = urlParams.get("view") as ViewMode | null;
      if (urlViewMode && ["my", "all", "unassigned"].includes(urlViewMode)) {
        return urlViewMode;
      }

      // Then check localStorage as fallback
      const storedViewMode = localStorage.getItem(
        "leadsViewMode"
      ) as ViewMode | null;
      if (
        storedViewMode &&
        ["my", "all", "unassigned"].includes(storedViewMode)
      ) {
        return storedViewMode;
      }
    }
    return isSalesRep ? "my" : "all";
  };

  const [viewMode, setViewMode] = useState<ViewMode>(getInitialViewMode());

  // Sync viewMode and statusFilter from URL on mount (in case URL changed externally)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlViewMode = urlParams.get("view") as ViewMode | null;
      if (
        urlViewMode &&
        ["my", "all", "unassigned"].includes(urlViewMode) &&
        urlViewMode !== viewMode
      ) {
        setViewMode(urlViewMode);
      }

      // Check for status parameter
      const urlStatus = urlParams.get("status");
      if (urlStatus && urlStatus !== statusFilter) {
        setStatusFilter(urlStatus);
      }

      // Check for showOverdue parameter (which actually means show inactive leads)
      const showOverdue = urlParams.get("showOverdue");
      if (showOverdue === "true") {
        setShowInactiveOnly(true);
        setDismissedAlert(true);
      }
    }
  }, [viewMode, statusFilter]);

  // Update URL and localStorage when viewMode changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      urlParams.set("view", viewMode);

      // Store in localStorage as backup
      localStorage.setItem("leadsViewMode", viewMode);

      const newUrl = `/leads?${urlParams.toString()}`;
      // Only update if URL actually changed to avoid infinite loops
      if (window.location.pathname + window.location.search !== newUrl) {
        router.replace(newUrl, { scroll: false });
      }
    }
  }, [viewMode, router]);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (viewMode === "my" && isSalesRep) {
        params.append("myLeads", "true");
      } else if (viewMode === "unassigned") {
        params.append("unassigned", "true");
      }

      const response = await fetch(`/api/leads?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch leads");

      const data = await response.json();
      setLeads(data.leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, viewMode, isSalesRep]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const getStatusColor = (status: LeadStatus) => {
    switch (status) {
      case "NEW":
        return "bg-blue-100 text-blue-800";
      case "ASSIGNED":
        return "bg-yellow-100 text-yellow-800";
      case "APPOINTMENT_SET":
        return "bg-purple-100 text-purple-800";
      case "QUOTED":
        return "bg-orange-100 text-orange-800";
      case "WON":
        return "bg-green-100 text-green-800";
      case "LOST":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // SALES_REP viewing all leads = read-only (can't click)
  // CONCIERGE viewing all leads = can click and view (can add notes)
  const isViewingAllLeads = 
    session?.user.role === "SALES_REP" && viewMode === "all";

  // Filter and sort leads
  const filteredLeads = useMemo(() => {
    let result = [...leads];

    // Filter by inactive if needed
    if (showInactiveOnly) {
      result = result.filter((lead) => lead.isInactive === true);
    }

    // Auto-sort: inactive leads first
    result.sort((a, b) => {
      if (a.isInactive && !b.isInactive) return -1;
      if (!a.isInactive && b.isInactive) return 1;
      return 0;
    });

    return result;
  }, [leads, showInactiveOnly]);

  // Fetch sales rep's own leads separately to calculate inactive count for banner
  const [myLeadsForCount, setMyLeadsForCount] = useState<Lead[]>([]);

  const fetchMyLeadsForCount = useCallback(async () => {
    if (isSalesRep) {
      try {
        const response = await fetch(`/api/leads?myLeads=true`);
        if (response.ok) {
          const data = await response.json();
          setMyLeadsForCount(data.leads || []);
        }
      } catch (error) {
        console.error("Error fetching my leads for count:", error);
      }
    }
  }, [isSalesRep]);

  useEffect(() => {
    fetchMyLeadsForCount();
  }, [fetchMyLeadsForCount]);

  // Count inactive leads - use myLeadsForCount for sales reps, otherwise use current leads
  const inactiveCount = useMemo(() => {
    const leadsToCount =
      isSalesRep && myLeadsForCount.length > 0 ? myLeadsForCount : leads;
    return leadsToCount.filter((lead) => lead.isInactive === true).length;
  }, [leads, myLeadsForCount, isSalesRep]);

  // Format time since activity
  const formatTimeSinceActivity = (
    hours: number | null | undefined
  ): string => {
    if (hours === null || hours === undefined) return "Closed/Inactive";
    if (hours < 24) return "Today";
    const days = Math.floor(hours / 24);
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
  };

  const columns: ColumnsType<Lead> = useMemo(() => {
    // For sales reps viewing all leads, show only name and assigned to
    if (isViewingAllLeads) {
      return [
        {
          title: "Customer",
          dataIndex: ["customer", "firstName"],
          key: "customer",
          sorter: (a: Lead, b: Lead) => {
            const nameA = `${a.customer.firstName} ${a.customer.lastName}`;
            const nameB = `${b.customer.firstName} ${b.customer.lastName}`;
            return nameA.localeCompare(nameB);
          },
          render: (_: any, record: Lead) => {
            return (
              <span className="font-medium">
                {record.customer.firstName} {record.customer.lastName}
              </span>
            );
          },
        },
        {
          title: "Assigned To",
          dataIndex: ["assignedSalesRep", "name"],
          key: "assignedTo",
          sorter: (a: Lead, b: Lead) => {
            const nameA =
              a.assignedSalesRep?.name || a.assignedSalesRep?.email || "";
            const nameB =
              b.assignedSalesRep?.name || b.assignedSalesRep?.email || "";
            return nameA.localeCompare(nameB);
          },
          render: (_: any, record: Lead) => {
            if (!record.assignedSalesRep) return "-";
            return (
              record.assignedSalesRep.name || record.assignedSalesRep.email
            );
          },
        },
      ];
    }

    // Full columns for admins or sales reps viewing their own leads
    return [
      {
        title: "Customer #",
        dataIndex: "customerNumber",
        key: "customerNumber",
        width: 120,
        sorter: (a: Lead, b: Lead) => {
          const numA = a.customerNumber || "";
          const numB = b.customerNumber || "";
          return numA.localeCompare(numB);
        },
        render: (_: any, record: Lead) => (
          <span className="font-mono text-xs text-muted-foreground">
            {record.customerNumber || "-"}
          </span>
        ),
      },
      {
        title: "Customer",
        dataIndex: ["customer", "firstName"],
        key: "customer",
        sorter: (a, b) => {
          const nameA = `${a.customer.firstName} ${a.customer.lastName}`;
          const nameB = `${b.customer.firstName} ${b.customer.lastName}`;
          return nameA.localeCompare(nameB);
        },
        render: (_, record) => {
          return (
            <Link
              href={`/leads/${record.id}`}
              className="text-primary hover:underline font-medium transition-colors"
            >
              {record.customer.firstName} {record.customer.lastName}
            </Link>
          );
        },
      },
      {
        title: "Phone",
        dataIndex: ["customer", "phone"],
        key: "phone",
        sorter: (a: Lead, b: Lead) => {
          const phoneA = a.customer.phone || "";
          const phoneB = b.customer.phone || "";
          return phoneA.localeCompare(phoneB);
        },
        render: (_: any, record: Lead) =>
          record.customer.phone
            ? formatPhoneNumber(record.customer.phone)
            : "-",
      },
      {
        title: "Email",
        dataIndex: ["customer", "email"],
        key: "email",
        sorter: (a, b) => {
          const emailA = a.customer.email || "";
          const emailB = b.customer.email || "";
          return emailA.localeCompare(emailB);
        },
        render: (_, record) => record.customer.email || "-",
      },
      {
        title: "Type",
        dataIndex: "leadTypes",
        key: "leadTypes",
        render: (_: any, record: Lead) => {
          const types = record.leadTypes || [];
          const maxVisible = 2;
          const visibleTypes = types.slice(0, maxVisible);
          const remainingCount = types.length - maxVisible;

          if (types.length === 0) {
            return <span className="text-muted-foreground text-xs">-</span>;
          }

          return (
            <div
              className="flex items-center gap-1 flex-wrap"
              title={formatLeadTypes(types)}
            >
              {visibleTypes.map((type: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground whitespace-nowrap"
                >
                  {formatLeadType(type)}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground whitespace-nowrap">
                  +{remainingCount} more
                </span>
              )}
            </div>
          );
        },
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        sorter: (a: Lead, b: Lead) => a.status.localeCompare(b.status),
        filters: [
          { text: "New", value: "NEW" },
          { text: "Assigned", value: "ASSIGNED" },
          { text: "Appointment Set", value: "APPOINTMENT_SET" },
          { text: "Quoted", value: "QUOTED" },
          { text: "Won", value: "WON" },
          { text: "Lost", value: "LOST" },
        ],
        onFilter: (value: any, record: Lead) => record.status === value,
        render: (status: LeadStatus) => {
          return (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusColor(
                status
              )}`}
            >
              {status.replace("_", " ")}
            </span>
          );
        },
      },
      {
        title: "Assigned To",
        dataIndex: ["assignedSalesRep", "name"],
        key: "assignedTo",
        sorter: (a: Lead, b: Lead) => {
          const nameA =
            a.assignedSalesRep?.name || a.assignedSalesRep?.email || "";
          const nameB =
            b.assignedSalesRep?.name || b.assignedSalesRep?.email || "";
          return nameA.localeCompare(nameB);
        },
        render: (_: any, record: Lead) => {
          if (!record.assignedSalesRep) return "-";
          return record.assignedSalesRep.name || record.assignedSalesRep.email;
        },
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        sorter: (a: Lead, b: Lead) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (date: string) => new Date(date).toLocaleDateString(),
      },
      // Only show Last Activity column for admins or sales reps viewing their own leads
      ...(isAdmin || (isSalesRep && viewMode === "my")
        ? [
            {
              title: "Last Activity",
              dataIndex: "lastActivityTimestamp",
              key: "lastActivity",
              sorter: (a: Lead, b: Lead) => {
                const hoursA = a.hoursSinceActivity ?? Infinity;
                const hoursB = b.hoursSinceActivity ?? Infinity;
                return hoursA - hoursB;
              },
              render: (_: any, record: Lead) => {
                const isInactive = record.isInactive;
                const timeText = formatTimeSinceActivity(
                  record.hoursSinceActivity
                );

                return (
                  <div className="flex items-center gap-2">
                    {isInactive && <Bell className="h-4 w-4 text-amber-600" />}
                    <span
                      className={isInactive ? "text-amber-700 font-medium" : ""}
                    >
                      {timeText}
                    </span>
                  </div>
                );
              },
            },
          ]
        : []),
    ];
  }, [isViewingAllLeads, isAdmin, isSalesRep, viewMode]);

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 w-full">
        <div className="min-w-0 flex-1 w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">
            {isSalesRep && viewMode === "my"
              ? "My Leads"
              : isSalesRep && viewMode === "unassigned"
              ? "Unassigned Leads"
              : "Leads"}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1 break-words">
            {isSalesRep && viewMode === "my"
              ? "Your assigned leads"
              : isSalesRep && viewMode === "unassigned"
              ? "Leads available to claim"
              : "Manage and track your leads"}
          </p>
        </div>
        <Link href="/leads/new" className="w-full sm:w-auto flex-shrink-0 sm:flex-shrink">
          <Button className="w-full sm:w-auto whitespace-nowrap [touch-action:manipulation] min-h-[44px] sm:min-h-0">
            <Plus className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">New Lead</span>
          </Button>
        </Link>
      </div>

      {/* Alert Banner for Inactive Leads - Show for admins or sales reps on any tab */}
      {!dismissedAlert && inactiveCount > 0 && (isAdmin || isSalesRep) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-start gap-2 sm:gap-3">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-amber-900 mb-1">
                  {inactiveCount}{" "}
                  {inactiveCount === 1 ? "lead needs" : "leads need"} follow-up
                </h3>
                <p className="text-xs sm:text-sm text-amber-700 mb-3">
                  These leads have been inactive for over 48 hours. Please
                  update the status, add a note, or contact an Admin to close or
                  mark as Won.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                    onClick={() => setShowInactiveOnly(true)}
                  >
                    View Inactive Leads
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-700 hover:text-amber-900 hover:bg-amber-100 w-full sm:w-auto [touch-action:manipulation] min-h-[44px] sm:min-h-0"
                    onClick={() => setDismissedAlert(true)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setDismissedAlert(true)}
                className="text-amber-600 hover:text-amber-900 transition-colors flex-shrink-0 [touch-action:manipulation] min-h-[44px] sm:min-h-0 px-2"
                aria-label="Dismiss alert"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Mode Tabs - Only show for sales reps */}
      {isSalesRep && (
        <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto w-full -mx-4 sm:mx-0 px-4 sm:px-0 scrollbar-hide">
          <button
            onClick={() => setViewMode("my")}
            className={`px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 [touch-action:manipulation] min-h-[44px] sm:min-h-0 ${
              viewMode === "my"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            My Leads
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={`px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 [touch-action:manipulation] min-h-[44px] sm:min-h-0 ${
              viewMode === "all"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            All Leads
          </button>
          <button
            onClick={() => setViewMode("unassigned")}
            className={`px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-medium transition-colors border-b-2 whitespace-nowrap flex-shrink-0 [touch-action:manipulation] min-h-[44px] sm:min-h-0 ${
              viewMode === "unassigned"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="hidden sm:inline">Unassigned Leads</span>
            <span className="sm:hidden">Unassigned</span>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 py-2.5 px-3 border-b border-gray-200 w-full">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-[140px] text-sm [touch-action:manipulation] min-h-[36px] sm:min-h-0"
            >
              <option value="all">All Statuses</option>
              <option value="NEW">New</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="APPOINTMENT_SET">Appointment Set</option>
              <option value="QUOTED">Quoted</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </Select>
          </div>
          {/* Show inactive filter only for admins or sales reps viewing their own leads */}
          {(isAdmin || (isSalesRep && viewMode === "my")) && (
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-2.5 py-1.5 rounded-md transition-colors [touch-action:manipulation] min-h-[36px] sm:min-h-0">
              <input
                type="checkbox"
                checked={showInactiveOnly}
                onChange={(e) => {
                  setShowInactiveOnly(e.target.checked);
                  if (e.target.checked) setDismissedAlert(true);
                }}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span className="flex items-center gap-1.5 text-sm">
                <Bell className="h-4 w-4 text-amber-600" />
                <span className="text-amber-900 font-medium whitespace-nowrap">
                  Inactive leads
                </span>
                {inactiveCount > 0 && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-xs px-1.5">
                    {inactiveCount}
                  </Badge>
                )}
              </span>
            </label>
          )}
        </div>
        {/* Only show read-only message for SALES_REP viewing all leads, not CONCIERGE */}
        {isViewingAllLeads && session?.user.role === "SALES_REP" && (
          <Badge variant="outline" className="text-xs text-muted-foreground border-gray-300 bg-gray-50">
            Read-only view
          </Badge>
        )}
      </div>

      {/* Leads Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading leads...
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No leads found.{" "}
            <Link href="/leads/new" className="text-primary hover:underline">
              Create your first lead
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-full overflow-hidden">
          <CardContent className="p-2 sm:p-4 w-full max-w-full overflow-hidden">
            <div className="overflow-x-auto w-full max-w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
              <Table
                dataSource={filteredLeads}
                columns={columns}
                rowKey="id"
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showTotal: (total: number) => `Total ${total} leads`,
                  pageSizeOptions: ["10", "20", "50", "100"],
                  responsive: true,
                  showLessItems: true,
                }}
                onRow={(record: Lead) => {
                  return {
                    onClick: () => {
                      // Allow navigation for all users except SALES_REP viewing all leads
                      // CONCIERGE can click and view any lead
                      if (!isViewingAllLeads) {
                        router.push(`/leads/${record.id}`);
                      }
                    },
                    style: {
                      cursor: isViewingAllLeads ? "default" : "pointer",
                      backgroundColor: record.isInactive ? "#fffbeb" : undefined,
                      borderLeft: record.isInactive
                        ? "4px solid #fbbf24"
                        : undefined,
                      paddingLeft: record.isInactive ? "8px" : undefined,
                    },
                  };
                }}
                scroll={{
                  x: "max-content",
                  y: 600,
                }}
                size="middle"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
