"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Plus, Edit, Trash2, X } from "lucide-react";
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

type CrewMember = {
  name: string;
  type: "user" | "external";
};

type Crew = {
  id: string;
  name: string;
  description: string | null;
  memberNames: string[];
  userMembers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  allMembers: CrewMember[];
  jobAssignmentCount: number;
  createdAt: string;
  updatedAt: string;
};

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

export function CrewsContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [deletingCrew, setDeletingCrew] = useState<Crew | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUserIds, setFormUserIds] = useState<string[]>([]);
  const [formMemberNames, setFormMemberNames] = useState<string[]>([]);
  const [newMemberName, setNewMemberName] = useState("");

  const fetchCrews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crews");
      if (!response.ok) throw new Error("Failed to fetch crews");
      const data = await response.json();
      setCrews(data.crews || []);
    } catch (error) {
      console.error("Error fetching crews:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchCrews();
    fetchUsers();
  }, [fetchCrews, fetchUsers]);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormUserIds([]);
    setFormMemberNames([]);
    setNewMemberName("");
    setEditingCrew(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (crew: Crew) => {
    setFormName(crew.name);
    setFormDescription(crew.description || "");
    setFormUserIds([]); // System users removed from UI
    setFormMemberNames(crew.memberNames);
    setEditingCrew(crew);
    setShowCreateModal(true);
  };

  const handleAddMemberName = () => {
    if (newMemberName.trim() && !formMemberNames.includes(newMemberName.trim())) {
      setFormMemberNames([...formMemberNames, newMemberName.trim()]);
      setNewMemberName("");
    }
  };

  const handleRemoveMemberName = (name: string) => {
    setFormMemberNames(formMemberNames.filter((n) => n !== name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formName,
        description: formDescription || undefined,
        userIds: [], // System users removed from UI
        memberNames: formMemberNames,
      };

      const url = editingCrew ? `/api/crews/${editingCrew.id}` : "/api/crews";
      const method = editingCrew ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save crew");
      }

      setShowCreateModal(false);
      resetForm();
      fetchCrews();
    } catch (error: any) {
      console.error("Error saving crew:", error);
      alert(error.message || "Failed to save crew");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCrew) return;

    try {
      const response = await fetch(`/api/crews/${deletingCrew.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete crew");
      }

      setDeletingCrew(null);
      fetchCrews();
    } catch (error: any) {
      console.error("Error deleting crew:", error);
      alert(error.message || "Failed to delete crew");
    }
  };

  const columns: ColumnsType<Crew> = useMemo(() => {
    return [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        sorter: (a: Crew, b: Crew) => a.name.localeCompare(b.name),
        render: (name: string) => (
          <span className="font-medium">{name}</span>
        ),
      },
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (description: string | null) => (
          <span className="text-sm text-muted-foreground">
            {description || "-"}
          </span>
        ),
      },
      {
        title: "Members",
        key: "members",
        render: (_: any, record: Crew) => {
          const totalMembers = record.allMembers.length;
          if (totalMembers === 0) {
            return <span className="text-muted-foreground text-sm">No members</span>;
          }
          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">{totalMembers} member{totalMembers !== 1 ? "s" : ""}</span>
              <div className="flex flex-wrap gap-1">
                {record.allMembers.slice(0, 3).map((member, idx) => (
                  <Badge
                    key={idx}
                    variant={member.type === "user" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {member.name}
                  </Badge>
                ))}
                {record.allMembers.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{record.allMembers.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: "Assigned Jobs",
        dataIndex: "jobAssignmentCount",
        key: "jobAssignmentCount",
        sorter: (a: Crew, b: Crew) =>
          a.jobAssignmentCount - b.jobAssignmentCount,
        render: (count: number) => (
          <span className="text-sm">{count}</span>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        render: (_: any, record: Crew) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openEditModal(record)}
              className="h-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeletingCrew(record)}
              className="h-8 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, []);

  if (session?.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 md:h-8 md:w-8" />
            Crew Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Create and manage crews to assign to jobs.
          </p>
        </div>
        <Button onClick={openCreateModal} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Create Crew
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading crews...
        </div>
      ) : crews.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No crews found. Create your first crew to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <Table
              dataSource={crews}
              columns={columns}
              rowKey="id"
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showTotal: (total: number) => `Total ${total} crews`,
                pageSizeOptions: ["10", "20", "50", "100"],
              }}
              scroll={{
                x: "max-content",
              }}
              size="middle"
            />
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {editingCrew ? "Edit Crew" : "Create Crew"}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetForm();
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    placeholder="e.g., Crew A, Landscaping Team"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Optional description for this crew"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Members</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddMemberName();
                        }
                      }}
                      placeholder="Enter member name"
                    />
                    <Button
                      type="button"
                      onClick={handleAddMemberName}
                      variant="outline"
                    >
                      Add
                    </Button>
                  </div>
                  {formMemberNames.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formMemberNames.map((name, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {name}
                          <button
                            type="button"
                            onClick={() => handleRemoveMemberName(name)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting
                      ? "Saving..."
                      : editingCrew
                      ? "Update Crew"
                      : "Create Crew"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingCrew}
        onOpenChange={(open) => !open && setDeletingCrew(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Crew</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCrew?.name}&quot;? This
              action cannot be undone.
              {deletingCrew && deletingCrew.jobAssignmentCount > 0 && (
                <span className="block mt-2 text-destructive">
                  This crew is assigned to {deletingCrew.jobAssignmentCount} job
                  {deletingCrew.jobAssignmentCount !== 1 ? "s" : ""}. You must
                  unassign all jobs before deleting.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
