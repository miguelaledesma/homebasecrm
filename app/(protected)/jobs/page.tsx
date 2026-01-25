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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, Briefcase, UserCog, Plus, X } from "lucide-react";
import { JobStatus } from "@prisma/client";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  formatLeadTypes,
  formatLeadType,
  formatPhoneNumber,
} from "@/lib/utils";

type Lead = {
  id: string;
  leadTypes: string[];
  description: string | null;
  status: string;
  jobStatus: JobStatus | null;
  jobScheduledDate: string | null;
  closedDate: string | null;
  jobCompletedDate: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  };
  assignedSalesRep: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  quotes: Array<{
    id: string;
    quoteNumber: string | null;
    status: string;
  }>;
  crewAssignments: Array<{
    id: string;
    crew: {
      id: string;
      name: string;
    };
  }>;
};

type Crew = {
  id: string;
  name: string;
};

export default function JobsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Lead[]>([]);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [assigningCrewJobId, setAssigningCrewJobId] = useState<string | null>(null);
  const [selectedCrewId, setSelectedCrewId] = useState<string>("");
  const [showSchedulingModal, setShowSchedulingModal] = useState(false);
  const [schedulingJobId, setSchedulingJobId] = useState<string | null>(null);
  const [jobScheduledDate, setJobScheduledDate] = useState<string>("");
  const [schedulingCrewIds, setSchedulingCrewIds] = useState<string[]>([]);
  const [allCrews, setAllCrews] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingCrews, setLoadingCrews] = useState(false);
  const [crewFetchError, setCrewFetchError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (jobStatusFilter !== "all") {
        params.append("jobStatus", jobStatusFilter);
      }

      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch jobs");

      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [jobStatusFilter]);

  const fetchCrews = useCallback(async () => {
    try {
      const response = await fetch("/api/crews");
      if (!response.ok) throw new Error("Failed to fetch crews");
      const data = await response.json();
      setCrews(data.crews || []);
    } catch (error) {
      console.error("Error fetching crews:", error);
    }
  }, []);

  useEffect(() => {
    fetchCrews();
  }, [fetchCrews]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Fetch all available crews when scheduling modal opens
  useEffect(() => {
    if (showSchedulingModal && session?.user?.role === "ADMIN") {
      setLoadingCrews(true);
      setCrewFetchError(null);
      setAllCrews([]);
      
      fetch("/api/crews")
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Failed to fetch crews");
          }
          return data;
        })
        .then((data) => {
          const crews = data.crews || [];
          
          if (!Array.isArray(crews)) {
            throw new Error("Invalid response format from server");
          }
          
          // Map to the format we need (id and name)
          const mappedCrews = crews
            .map((crew: any) => {
              if (!crew || !crew.id || !crew.name) {
                return null;
              }
              return {
                id: crew.id,
                name: crew.name,
              };
            })
            .filter((crew): crew is { id: string; name: string } => crew !== null);
          
          setAllCrews(mappedCrews);
          setCrewFetchError(null);
          setLoadingCrews(false);
        })
        .catch((error) => {
          console.error("Error fetching crews:", error);
          setCrewFetchError(error.message || "Failed to load crews. Please try again.");
          setAllCrews([]);
          setLoadingCrews(false);
        });
    }
  }, [showSchedulingModal, session?.user?.role]);

  const handleAssignCrew = useCallback(async (jobId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    // Find the job to check its status
    const job = jobs.find((j) => j.id === jobId);
    
    // If job status is "Not set" (null), show scheduling modal
    if (job && job.jobStatus === null) {
      setSchedulingJobId(jobId);
      // Pre-fill scheduled date if it exists, otherwise leave empty
      setJobScheduledDate(job.jobScheduledDate ? new Date(job.jobScheduledDate).toISOString().split("T")[0] : "");
      setSchedulingCrewIds([]);
      setShowSchedulingModal(true);
    } else {
      // Job is already scheduled/in progress, just assign crew directly
      setAssigningCrewJobId(jobId);
      setSelectedCrewId("");
    }
  }, [jobs]);

  const handleSaveCrewAssignment = useCallback(async (jobId: string) => {
    if (!selectedCrewId) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/crews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crewId: selectedCrewId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to assign crew");
      }

      setAssigningCrewJobId(null);
      setSelectedCrewId("");
      fetchJobs();
    } catch (error: any) {
      console.error("Error assigning crew:", error);
      alert(error.message || "Failed to assign crew");
    }
  }, [selectedCrewId, fetchJobs]);

  const handleUnassignCrew = async (jobId: string, crewId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to unassign this crew?")) return;

    try {
      const response = await fetch(`/api/jobs/${jobId}/crews?crewId=${crewId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to unassign crew");
      }

      fetchJobs();
    } catch (error: any) {
      console.error("Error unassigning crew:", error);
      alert(error.message || "Failed to unassign crew");
    }
  };

  const handleCancelScheduling = () => {
    setShowSchedulingModal(false);
    setSchedulingJobId(null);
    setJobScheduledDate("");
    setSchedulingCrewIds([]);
    setCrewFetchError(null);
  };

  const handleConfirmScheduling = async () => {
    if (!schedulingJobId) return;
    
    if (!jobScheduledDate) {
      alert("Please enter a scheduled start date");
      return;
    }

    try {
      // Update job status to SCHEDULED and set scheduled date
      const response = await fetch(`/api/leads/${schedulingJobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobStatus: "SCHEDULED",
          jobScheduledDate: jobScheduledDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to schedule job");
      }

      // Assign crews if any were selected
      if (schedulingCrewIds.length > 0) {
        for (const crewId of schedulingCrewIds) {
          try {
            await fetch(`/api/jobs/${schedulingJobId}/crews`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ crewId }),
            });
          } catch (error) {
            console.error(`Error assigning crew ${crewId}:`, error);
          }
        }
      }

      setShowSchedulingModal(false);
      setSchedulingJobId(null);
      setJobScheduledDate("");
      setSchedulingCrewIds([]);
      fetchJobs();
    } catch (error: any) {
      console.error("Error confirming scheduling:", error);
      alert(error.message || "Failed to schedule job. Please try again.");
    }
  };

  const getJobStatusColor = (status: JobStatus | null) => {
    if (!status) return "bg-gray-100 text-gray-800";
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-100 text-blue-800";
      case "IN_PROGRESS":
        return "bg-yellow-100 text-yellow-800";
      case "DONE":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatAddress = useCallback((customer: Lead["customer"]) => {
    const parts = [];
    if (customer.addressLine1) parts.push(customer.addressLine1);
    if (customer.addressLine2) parts.push(customer.addressLine2);
    const cityStateZip = [customer.city, customer.state, customer.zip]
      .filter(Boolean)
      .join(", ");
    if (cityStateZip) parts.push(cityStateZip);
    return parts.length > 0 ? parts.join("\n") : "-";
  }, []);

  const getQuoteNumber = useCallback((quotes: Lead["quotes"]) => {
    if (!quotes || quotes.length === 0) return "-";
    // Get the most recent quote with a quote number, or just the most recent quote
    const quoteWithNumber = quotes.find((q) => q.quoteNumber);
    return quoteWithNumber?.quoteNumber || quotes[0]?.quoteNumber || "-";
  }, []);

  const columns: ColumnsType<Lead> = useMemo(() => {
    return [
      {
        title: "Name",
        dataIndex: ["customer", "firstName"],
        key: "name",
        sorter: (a: Lead, b: Lead) => {
          const nameA = `${a.customer.firstName} ${a.customer.lastName}`;
          const nameB = `${b.customer.firstName} ${b.customer.lastName}`;
          return nameA.localeCompare(nameB);
        },
        render: (_: any, record: Lead) => {
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
        title: "Address",
        dataIndex: ["customer", "addressLine1"],
        key: "address",
        sorter: (a: Lead, b: Lead) => {
          const addressA = formatAddress(a.customer);
          const addressB = formatAddress(b.customer);
          return addressA.localeCompare(addressB);
        },
        render: (_: any, record: Lead) => {
          const address = formatAddress(record.customer);
          return (
            <div className="whitespace-pre-line text-sm">
              {address}
            </div>
          );
        },
      },
      {
        title: "Job Type",
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
        title: "Quote Number",
        dataIndex: "quotes",
        key: "quoteNumber",
        sorter: (a: Lead, b: Lead) => {
          const quoteA = getQuoteNumber(a.quotes);
          const quoteB = getQuoteNumber(b.quotes);
          return quoteA.localeCompare(quoteB);
        },
        render: (_: any, record: Lead) => {
          return <span className="text-sm">{getQuoteNumber(record.quotes)}</span>;
        },
      },
      {
        title: "Job Status",
        dataIndex: "jobStatus",
        key: "jobStatus",
        sorter: (a: Lead, b: Lead) => {
          const statusA = a.jobStatus || "";
          const statusB = b.jobStatus || "";
          return statusA.localeCompare(statusB);
        },
        filters: [
          { text: "Not Set", value: "not_set" },
          { text: "Scheduled", value: "SCHEDULED" },
          { text: "In Progress", value: "IN_PROGRESS" },
          { text: "Done", value: "DONE" },
        ],
        onFilter: (value: any, record: Lead) => {
          if (value === "not_set") {
            return record.jobStatus === null;
          }
          return record.jobStatus === value;
        },
        render: (status: JobStatus | null) => {
          if (!status) {
            return (
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                Not Set
              </span>
            );
          }
          return (
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getJobStatusColor(
                status
              )}`}
            >
              {status.replace("_", " ")}
            </span>
          );
        },
      },
      {
        title: "Assignee",
        dataIndex: ["assignedSalesRep", "name"],
        key: "assignee",
        sorter: (a: Lead, b: Lead) => {
          const nameA = a.assignedSalesRep?.name || a.assignedSalesRep?.email || "";
          const nameB = b.assignedSalesRep?.name || b.assignedSalesRep?.email || "";
          return nameA.localeCompare(nameB);
        },
        render: (_: any, record: Lead) => {
          if (!record.assignedSalesRep) return "-";
          return record.assignedSalesRep.name || record.assignedSalesRep.email;
        },
      },
      {
        title: "Completed Date",
        dataIndex: "jobCompletedDate",
        key: "completedDate",
        sorter: (a: Lead, b: Lead) => {
          const dateA = a.jobCompletedDate ? new Date(a.jobCompletedDate).getTime() : 0;
          const dateB = b.jobCompletedDate ? new Date(b.jobCompletedDate).getTime() : 0;
          return dateA - dateB;
        },
        render: (date: string | null) => {
          if (!date) return "-";
          return new Date(date).toLocaleDateString();
        },
      },
      {
        title: "Assigned Crews",
        key: "crews",
        render: (_: any, record: Lead) => {
          const assignedCrews = record.crewAssignments || [];
          const isAssigning = assigningCrewJobId === record.id;

          if (isAssigning) {
            const availableCrews = crews.filter(
              (c) => !assignedCrews.some((ac) => ac.crew.id === c.id)
            );

            return (
              <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={selectedCrewId}
                  onChange={(e) => setSelectedCrewId(e.target.value)}
                  className="w-full"
                >
                  <option value="">Select a crew...</option>
                  {availableCrews.map((crew) => (
                    <option key={crew.id} value={crew.id}>
                      {crew.name}
                    </option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSaveCrewAssignment(record.id)}
                    disabled={!selectedCrewId}
                    className="h-7 text-xs"
                  >
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setAssigningCrewJobId(null);
                      setSelectedCrewId("");
                    }}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            );
          }

          const maxVisibleCrews = 2;
          const visibleCrews = assignedCrews.slice(0, maxVisibleCrews);
          const remainingCount = assignedCrews.length - maxVisibleCrews;

          return (
            <div className="flex flex-col gap-1.5" onClick={(e) => e.stopPropagation()}>
              {assignedCrews.length === 0 ? (
                <span className="text-muted-foreground text-xs">None</span>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {visibleCrews.map((assignment) => (
                    <Badge
                      key={assignment.id}
                      variant="secondary"
                      className="text-xs px-1.5 py-0.5"
                    >
                      {assignment.crew.name}
                    </Badge>
                  ))}
                  {remainingCount > 0 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                      +{remainingCount}
                    </Badge>
                  )}
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => handleAssignCrew(record.id, e)}
                className="h-6 text-xs px-2 w-fit"
              >
                <Plus className="h-3 w-3 mr-1" />
                {assignedCrews.length === 0 ? "Assign" : "Add"}
              </Button>
            </div>
          );
        },
      },
    ];
  }, [formatAddress, getQuoteNumber, assigningCrewJobId, selectedCrewId, crews, handleAssignCrew, handleSaveCrewAssignment]);

  // Redirect if not admin
  useEffect(() => {
    if (session?.user && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 md:h-8 md:w-8" />
            Jobs
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage and track won leads with job status. Includes jobs that haven&apos;t been assigned a status yet.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filters:</span>
        </div>
        <div className="flex-1 flex flex-col sm:flex-row gap-3 sm:items-center">
          <Select
            value={jobStatusFilter}
            onChange={(e) => setJobStatusFilter(e.target.value)}
            className="sm:max-w-[200px]"
          >
            <option value="all">All Job Statuses</option>
            <option value="not_set">Not Set</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </Select>
        </div>
      </div>

      {/* Jobs Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading jobs...
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No jobs found. Jobs are created when leads are marked as Won.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <Table
              dataSource={jobs}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total: number) => `Total ${total} jobs`,
                pageSizeOptions: ["10", "20", "50", "100"],
              }}
              onRow={(record: Lead) => {
                return {
                  onClick: () => {
                    router.push(`/leads/${record.id}`);
                  },
                  style: {
                    cursor: "pointer",
                  },
                };
              }}
              scroll={{
                x: "max-content",
                y: 600,
              }}
              size="middle"
            />
          </CardContent>
        </Card>
      )}

      {/* Scheduling Modal */}
      {session?.user?.role === "ADMIN" && (
        <AlertDialog
          open={showSchedulingModal}
          onOpenChange={(open) => {
            if (!open) {
              handleCancelScheduling();
            }
          }}
        >
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Schedule Job</AlertDialogTitle>
              <AlertDialogDescription>
                Set the start date for this job and assign crews.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label htmlFor="scheduledDate" className="text-sm font-medium mb-2 block">
                  Start Date *
                </Label>
                <Input
                  id="scheduledDate"
                  type="date"
                  value={jobScheduledDate}
                  onChange={(e) => setJobScheduledDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full"
                  required
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Assign Crews (Optional)
                </Label>
                {loadingCrews ? (
                  <div className="text-sm text-muted-foreground mb-2">
                    Loading crews...
                  </div>
                ) : crewFetchError ? (
                  <div className="text-sm text-destructive text-center py-4 border border-destructive rounded-md">
                    {crewFetchError}
                  </div>
                ) : allCrews.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-4 border rounded-md">
                    No crews available. Create crews in the Crews Management page.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-3">
                    {allCrews.length > 0 ? (
                      allCrews.map((crew) => (
                        <div key={crew.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`scheduling-crew-${crew.id}`}
                            checked={schedulingCrewIds.includes(crew.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSchedulingCrewIds([...schedulingCrewIds, crew.id]);
                              } else {
                                setSchedulingCrewIds(
                                  schedulingCrewIds.filter((id) => id !== crew.id)
                                );
                              }
                            }}
                            className="rounded"
                          />
                          <label
                            htmlFor={`scheduling-crew-${crew.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {crew.name}
                          </label>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        No crews to display
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelScheduling}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmScheduling}
                disabled={!jobScheduledDate}
              >
                Schedule Job
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
