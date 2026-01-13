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
import { Filter, Briefcase } from "lucide-react";
import { JobStatus } from "@prisma/client";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
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
  closedDate: string | null;
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
};

export default function JobsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");

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

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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

  const columns: ColumnsType<Lead> = useMemo(() => {
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
          record.customer.phone ? formatPhoneNumber(record.customer.phone) : "-",
      },
      {
        title: "Email",
        dataIndex: ["customer", "email"],
        key: "email",
        sorter: (a: Lead, b: Lead) => {
          const emailA = a.customer.email || "";
          const emailB = b.customer.email || "";
          return emailA.localeCompare(emailB);
        },
        render: (_: any, record: Lead) => record.customer.email || "-",
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
        title: "Job Status",
        dataIndex: "jobStatus",
        key: "jobStatus",
        sorter: (a: Lead, b: Lead) => {
          const statusA = a.jobStatus || "";
          const statusB = b.jobStatus || "";
          return statusA.localeCompare(statusB);
        },
        filters: [
          { text: "Scheduled", value: "SCHEDULED" },
          { text: "In Progress", value: "IN_PROGRESS" },
          { text: "Done", value: "DONE" },
        ],
        onFilter: (value: any, record: Lead) => record.jobStatus === value,
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
        title: "Assigned To",
        dataIndex: ["assignedSalesRep", "name"],
        key: "assignedTo",
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
        title: "Closed Date",
        dataIndex: "closedDate",
        key: "closedDate",
        sorter: (a: Lead, b: Lead) => {
          const dateA = a.closedDate ? new Date(a.closedDate).getTime() : 0;
          const dateB = b.closedDate ? new Date(b.closedDate).getTime() : 0;
          return dateA - dateB;
        },
        render: (date: string | null) => {
          if (!date) return "-";
          return new Date(date).toLocaleDateString();
        },
      },
      {
        title: "Created",
        dataIndex: "createdAt",
        key: "createdAt",
        sorter: (a: Lead, b: Lead) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (date: string) => new Date(date).toLocaleDateString(),
      },
    ];
  }, []);

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
            Manage and track won leads with job status
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
            No jobs found. Jobs are created when leads are marked as Won with a job status.
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
    </div>
  );
}
