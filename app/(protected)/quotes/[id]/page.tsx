"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  DollarSign,
  FileText,
  Upload,
  Send,
  Download,
  Trash2,
  Edit2,
  Save,
  X,
  User,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { QuoteStatus, JobStatus } from "@prisma/client";
import { formatLeadTypes } from "@/lib/utils";
import { Card as AntCard, Tag, Divider } from "antd";

type Quote = {
  id: string;
  quoteNumber: string | null;
  amount: number;
  currency: string;
  status: QuoteStatus;
  sentAt: string | null;
  expiresAt: string | null;
  expenses: Record<string, number> | null;
  createdAt: string;
  updatedAt: string;
  lead: {
    id: string;
    leadTypes: string[];
    jobStatus: JobStatus | null;
    jobCompletedDate: string | null;
    customer: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
  appointment: {
    id: string;
    scheduledFor: string;
  } | null;
  salesRep: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  files: Array<{
    id: string;
    fileUrl: string;
    fileName?: string;
    fileType: string | null;
    uploadedAt: string;
    uploadedBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  }>;
};

export default function QuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<QuoteStatus>("DRAFT");
  const [amount, setAmount] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [originalAmount, setOriginalAmount] = useState<string>("");
  const [originalExpiresAt, setOriginalExpiresAt] = useState<string>("");
  const [originalStatus, setOriginalStatus] = useState<QuoteStatus>("DRAFT");
  const [viewingFile, setViewingFile] = useState<{
    url: string;
    name: string;
    type: string | null;
  } | null>(null);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<QuoteStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const profitLossFileInputRef = useRef<HTMLInputElement>(null);
  const [profitLossFile, setProfitLossFile] = useState<{
    id: string;
    fileUrl: string;
    fileName?: string;
    fileType: string | null;
    uploadedAt: string;
    uploadedBy: {
      id: string;
      name: string | null;
      email: string;
    } | null;
  } | null>(null);
  const [uploadingPL, setUploadingPL] = useState(false);
  const [deletingPL, setDeletingPL] = useState(false);
  const [isDraggingPL, setIsDraggingPL] = useState(false);
  const financialsRef = useRef<HTMLDivElement>(null);

  const quoteId = params.id as string;

  const fetchQuote = useCallback(async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/quotes");
          return;
        }
        throw new Error("Failed to fetch quote");
      }
      const data = await response.json();
      setQuote(data.quote);
      setStatus(data.quote.status);
      setOriginalStatus(data.quote.status);
      setAmount(data.quote.amount.toString());
      setOriginalAmount(data.quote.amount.toString());
      const expiresAtValue = data.quote.expiresAt
        ? new Date(data.quote.expiresAt).toISOString().slice(0, 16)
        : "";
      setExpiresAt(expiresAtValue);
      setOriginalExpiresAt(expiresAtValue);
    } catch (error) {
      console.error("Error fetching quote:", error);
    } finally {
      setLoading(false);
    }
  }, [quoteId, router]);

  const fetchProfitLossFile = useCallback(async () => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/profit-loss`);
      if (!response.ok) {
        if (response.status === 404) {
          setProfitLossFile(null);
          return;
        }
        throw new Error("Failed to fetch P&L file");
      }
      const data = await response.json();
      setProfitLossFile(data.file);
    } catch (error) {
      console.error("Error fetching P&L file:", error);
      setProfitLossFile(null);
    }
  }, [quoteId]);

  useEffect(() => {
    // Fetch P&L file if quote is ACCEPTED and job is DONE and user is ADMIN
    if (quote && quote.status === "ACCEPTED" && quote.lead.jobStatus === "DONE" && session?.user.role === "ADMIN") {
      fetchProfitLossFile();
    }
  }, [quote, session, fetchProfitLossFile]);

  useEffect(() => {
    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId, fetchQuote]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/quotes/${quoteId}/files`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload file");
      }

      fetchQuote();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      alert(error.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleSendQuote = async () => {
    if (
      !confirm(
        "Are you sure you want to send this quote? This will mark it as sent."
      )
    ) {
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/send`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send quote");
      }

      fetchQuote();
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to send quote");
    } finally {
      setSending(false);
    }
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setAmount(originalAmount);
    setExpiresAt(originalExpiresAt);
    setStatus(originalStatus);
  };

  const handleSaveChanges = async () => {
    if (!quote) return;

    const newAmount = parseFloat(amount);
    if (isNaN(newAmount) || newAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    // If status is being changed to ACCEPTED, show confirmation
    if (status === QuoteStatus.ACCEPTED && originalStatus !== QuoteStatus.ACCEPTED) {
      setPendingStatus(status);
      setShowAcceptConfirm(true);
      return;
    }

    await performSaveChanges();
  };

  const performSaveChanges = async () => {
    if (!quote) return;

    const newAmount = parseFloat(amount);
    setUpdating(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: newAmount,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          status: status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update quote");
      }

      setIsEditing(false);
      fetchQuote();
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to update quote");
    } finally {
      setUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus: QuoteStatus) => {
    // If changing to ACCEPTED, show confirmation dialog
    // Check against the quote's current status, not the local state
    if (newStatus === QuoteStatus.ACCEPTED && quote && quote.status !== QuoteStatus.ACCEPTED) {
      setPendingStatus(newStatus);
      setShowAcceptConfirm(true);
      return;
    }

    // For other status changes, proceed normally
    await performStatusUpdate(newStatus);
  };

  const performStatusUpdate = async (newStatus: QuoteStatus) => {
    if (!isEditing) {
      // If not in edit mode, update immediately (for non-admin users)
      try {
        const response = await fetch(`/api/quotes/${quoteId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to update quote");
        }

        fetchQuote();
        router.refresh();
      } catch (error: any) {
        alert(error.message || "Failed to update quote");
      }
    } else {
      // If in edit mode, just update local state
      setStatus(newStatus);
    }
  };

  const handleConfirmAccept = async () => {
    setShowAcceptConfirm(false);
    if (pendingStatus) {
      if (isEditing) {
        // If in edit mode, save all changes including the status
        await performSaveChanges();
      } else {
        // If not in edit mode, just update the status
        await performStatusUpdate(pendingStatus);
      }
      setPendingStatus(null);
    }
  };

  const handleCancelAccept = () => {
    setShowAcceptConfirm(false);
    setPendingStatus(null);
    // Revert status dropdown to original value
    if (quote) {
      setStatus(quote.status);
    } else if (originalStatus) {
      setStatus(originalStatus);
    }
  };

  const handleDeleteQuote = async () => {
    if (!quote) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete quote");
      }

      router.push(`/leads/${quote.lead.id}`);
    } catch (error: any) {
      alert(error.message || "Failed to delete quote");
      setDeleting(false);
    }
  };

  const handleProfitLossFileUpload = async (file: File) => {
    setUploadingPL(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/quotes/${quoteId}/profit-loss`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to upload P&L file");
      }

      const result = await response.json();
      setProfitLossFile(result.file);
      
      // Scroll to the financials section
      if (financialsRef.current) {
        financialsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error: any) {
      alert(error.message || "Failed to upload P&L file");
    } finally {
      setUploadingPL(false);
      if (profitLossFileInputRef.current) {
        profitLossFileInputRef.current.value = "";
      }
    }
  };

  const handleProfitLossFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProfitLossFileUpload(file);
    }
  };

  const handleProfitLossFileDelete = async () => {
    if (!profitLossFile) return;

    if (!confirm("Are you sure you want to delete the Profit & Loss file?")) {
      return;
    }

    setDeletingPL(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/profit-loss`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete P&L file");
      }

      setProfitLossFile(null);
    } catch (error: any) {
      alert(error.message || "Failed to delete P&L file");
    } finally {
      setDeletingPL(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPL(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPL(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingPL(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProfitLossFileUpload(file);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!quote) {
    return <div className="text-center py-8">Quote not found</div>;
  }

  const canEdit = session?.user.role === "ADMIN";
  const canDelete = session?.user.role === "ADMIN";
  const canUpdateStatus = canEdit || (quote.salesRep?.id === session?.user.id);
  // Upload permissions: ADMIN can upload to any quote, SALES_REP can upload to their own quotes
  const canUpload =
    session?.user.role === "ADMIN" || (quote.salesRep?.id === session?.user.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/leads/${quote.lead.id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Quote Details</h1>
            <p className="text-muted-foreground">
              {quote.lead.customer.firstName} {quote.lead.customer.lastName} -{" "}
              {formatLeadTypes(quote.lead.leadTypes || [])}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/leads/${quote.lead.id}`}>
            <Button variant="outline" size="sm">
              <User className="h-4 w-4 mr-2" />
              View Lead
            </Button>
          </Link>
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {deleting ? "Deleting..." : "Delete Quote"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    the quote for {quote.lead.customer.firstName}{" "}
                    {quote.lead.customer.lastName}(
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: quote.currency,
                    }).format(quote.amount)}
                    ).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteQuote}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Quote Information</CardTitle>
              {canEdit && !isEditing && (
                <Button variant="outline" size="sm" onClick={handleStartEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              {canEdit && isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={updating}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={updating}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updating ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label
                htmlFor="amount"
                className="text-sm font-medium text-muted-foreground"
              >
                Amount
              </Label>
              {canEdit && isEditing ? (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-lg font-semibold">
                    {quote.currency}
                  </span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={updating}
                    className="text-2xl font-bold"
                  />
                </div>
              ) : (
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: quote.currency,
                  }).format(quote.amount)}
                </p>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">
                Status
              </p>
              <Select
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value as QuoteStatus;
                  setStatus(newStatus);
                  handleStatusUpdate(newStatus);
                }}
                disabled={!canUpdateStatus || (isEditing && !canEdit)}
              >
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="DECLINED">Declined</option>
                <option value="EXPIRED">Expired</option>
              </Select>
            </div>

            {quote.appointment && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Related Appointment
                </p>
                <p className="text-sm">
                  {new Date(quote.appointment.scheduledFor).toLocaleString()}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Sales Rep
              </p>
              <p className="text-sm">
                {quote.salesRep?.name || quote.salesRep?.email || "Deleted User"}
              </p>
            </div>

            <div className="pt-4 border-t space-y-2">
              {quote.quoteNumber && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Estimate #
                  </p>
                  <p className="text-sm">{quote.quoteNumber}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Created
                </p>
                <p className="text-sm">
                  {new Date(quote.createdAt).toLocaleString()}
                </p>
              </div>
              {quote.sentAt && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Sent
                  </p>
                  <p className="text-sm">
                    {new Date(quote.sentAt).toLocaleString()}
                  </p>
                </div>
              )}
              <div>
                <Label
                  htmlFor="expiresAt"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Expires
                </Label>
                {canEdit && isEditing ? (
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    disabled={updating}
                    className="mt-1"
                  />
                ) : quote.expiresAt ? (
                  <p className="text-sm">
                    {new Date(quote.expiresAt).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No expiration date
                  </p>
                )}
              </div>
            </div>

            {quote.status === "DRAFT" && canEdit && (
              <Button
                onClick={handleSendQuote}
                disabled={sending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : "Send Quote"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Files Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Files</CardTitle>
                <CardDescription>Upload and manage quote files</CardDescription>
              </div>
              {canUpload && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  size="sm"
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />

            {quote.files.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No files uploaded yet.
                {canUpload && " Upload a file to get started."}
              </div>
            ) : (
              <div className="space-y-3">
                {quote.files.map((file) => {
                  // Use fileName from API if available, otherwise fall back to extraction
                  const fileName =
                    file.fileName ||
                    (() => {
                      if (file.fileUrl.startsWith("data:")) {
                        return "Uploaded file";
                      }
                      // Fallback: try to extract from presigned URL (parse URL and get pathname)
                      try {
                        const url = new URL(file.fileUrl);
                        const pathname = url.pathname;
                        const parts = pathname.split("/");
                        const filename = parts[parts.length - 1];
                        // Remove timestamp prefix if present (format: timestamp-filename)
                        const match = filename.match(/^\d+-(.+)$/);
                        return match ? match[1] : filename;
                      } catch {
                        return "Uploaded file";
                      }
                    })();
                  // Check if user can delete this file (ADMIN or file uploader)
                  const canDeleteFile =
                    session?.user.role === "ADMIN" ||
                    (file.uploadedBy?.id === session?.user.id);

                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.fileType && (
                              <span className="uppercase">{file.fileType}</span>
                            )}
                            {" • "}
                            Uploaded{" "}
                            {new Date(file.uploadedAt).toLocaleString()}
                            {file.uploadedBy?.name ? (
                              <> by {file.uploadedBy.name}</>
                            ) : file.uploadedBy ? (
                              <> by {file.uploadedBy.email}</>
                            ) : (
                              <> by Deleted User</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setViewingFile({
                              url: file.fileUrl,
                              name: fileName,
                              type: file.fileType,
                            })
                          }
                          title="View file"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(file.fileUrl, "_blank")}
                          title="Download file"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {canDeleteFile && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              if (
                                !confirm(
                                  "Are you sure you want to delete this file?"
                                )
                              ) {
                                return;
                              }

                              try {
                                const response = await fetch(
                                  `/api/quotes/${quoteId}/files/${file.id}`,
                                  {
                                    method: "DELETE",
                                  }
                                );

                                if (!response.ok) {
                                  const data = await response.json();
                                  throw new Error(
                                    data.error || "Failed to delete file"
                                  );
                                }

                                fetchQuote();
                              } catch (error: any) {
                                alert(error.message || "Failed to delete file");
                              }
                            }}
                            title="Delete file"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Job Financials Section - Only show for ACCEPTED quotes with DONE job status and ADMIN users */}
      {quote.status === "ACCEPTED" &&
        quote.lead.jobStatus === "DONE" &&
        session?.user.role === "ADMIN" && (
          <>
            {/* Alert banner when no P&L file is uploaded */}
            {!profitLossFile && (
              <Card className="mt-6 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                        No Profit & Loss file uploaded yet
                      </h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Upload the Profit & Loss document for this completed job to maintain accurate financial records.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <AntCard
              ref={financialsRef}
              style={{
                marginTop: 24,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 600, margin: 0, marginBottom: 4 }}>
                  Job Financials
                </h2>
                <p style={{ color: "#666", margin: 0, fontSize: 14 }}>
                  Upload Profit & Loss document for this completed job
                </p>
              </div>
              <Tag
                color="blue"
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 16,
                  textTransform: "capitalize",
                }}
              >
                {quote.lead.jobStatus?.toLowerCase().replace("_", " ")}
              </Tag>
            </div>

            {quote.lead.jobCompletedDate && (
              <div style={{ marginBottom: 16, color: "#666", fontSize: 14 }}>
                Completed: {new Date(quote.lead.jobCompletedDate).toLocaleDateString("en-US", {
                  month: "numeric",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            )}

            <Divider style={{ margin: "16px 0" }} />

            {/* Revenue Section */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>Revenue</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <DollarSign className="h-6 w-6" style={{ color: "#1890ff" }} />
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: "#000",
                  }}
                >
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: quote.currency,
                  }).format(quote.amount)}
                </span>
                <span style={{ color: "#999", fontSize: 14, marginLeft: 8 }}>Quote Amount</span>
              </div>
            </div>

            <Divider style={{ margin: "16px 0" }} />

            {/* Profit & Loss File Section */}
            <div>
              <div style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>Profit & Loss Document</div>
              
              {profitLossFile ? (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      padding: 16,
                      border: "1px solid #e8e8e8",
                      borderRadius: 8,
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <FileText className="h-5 w-5" style={{ color: "#1890ff" }} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                            {profitLossFile.fileName || "Profit & Loss Document"}
                          </div>
                          <div style={{ fontSize: 12, color: "#999" }}>
                            Uploaded {new Date(profitLossFile.uploadedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {profitLossFile.uploadedBy?.name ? ` by ${profitLossFile.uploadedBy.name}` : ""}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setViewingFile({
                              url: profitLossFile.fileUrl,
                              name: profitLossFile.fileName || "Profit & Loss Document",
                              type: profitLossFile.fileType,
                            })
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(profitLossFile.fileUrl, "_blank")}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleProfitLossFileDelete}
                          disabled={deletingPL}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deletingPL ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    padding: 32,
                    border: `2px dashed ${isDraggingPL ? "#1890ff" : "#d9d9d9"}`,
                    borderRadius: 8,
                    backgroundColor: isDraggingPL ? "#f0f7ff" : "#fafafa",
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                  onClick={() => profitLossFileInputRef.current?.click()}
                >
                  <input
                    ref={profitLossFileInputRef}
                    type="file"
                    onChange={handleProfitLossFileChange}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
                    style={{ display: "none" }}
                  />
                  <Upload className="h-12 w-12 mx-auto mb-4" style={{ color: "#999" }} />
                  <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 8, color: "#000" }}>
                    {isDraggingPL ? "Drop file here" : "Click to upload or drag and drop"}
                  </div>
                  <div style={{ fontSize: 14, color: "#999" }}>
                    PDF, Word, Excel, Images, or Text files (max 10 MB)
                  </div>
                  {uploadingPL && (
                    <div style={{ marginTop: 16, fontSize: 14, color: "#1890ff" }}>
                      Uploading...
                    </div>
                  )}
                </div>
              )}
            </div>
          </AntCard>
          </>
        )}

      {/* File Viewer Modal */}
      {viewingFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setViewingFile(null)}
        >
          <div
            className="relative w-full h-full max-w-6xl max-h-[90vh] m-4 bg-background rounded-lg shadow-lg flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">{viewingFile.name}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingFile(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4">
              {viewingFile.type?.startsWith("image/") ? (
                <img
                  src={viewingFile.url}
                  alt={viewingFile.name}
                  className="max-w-full max-h-full mx-auto"
                />
              ) : viewingFile.type === "application/pdf" ||
                viewingFile.name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={viewingFile.url}
                  className="w-full h-full min-h-[600px] border-0"
                  title={viewingFile.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">
                    Preview not available
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    This file type cannot be previewed in the browser.
                  </p>
                  <Button
                    onClick={() => window.open(viewingFile.url, "_blank")}
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download to view
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Accepting Quote */}
      <AlertDialog open={showAcceptConfirm} onOpenChange={setShowAcceptConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Quote?</AlertDialogTitle>
            <AlertDialogDescription>
              Once this quote is accepted, the lead will automatically be marked as WON. 
              This action cannot be easily undone. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAccept}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAccept}>
              Yes, Accept Quote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
