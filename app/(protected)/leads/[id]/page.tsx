"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
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
import {
  ArrowLeft,
  Plus,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  Trash2,
  Edit,
  X,
  CheckCircle,
  Upload,
} from "lucide-react";
import { LeadStatus, AppointmentStatus, QuoteStatus, JobStatus } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  formatLeadTypes,
  formatLeadType,
  formatPhoneNumber,
} from "@/lib/utils";

type LeadType =
  | "FLOOR"
  | "CARPET"
  | "TILE_STONE"
  | "MATERIALS"
  | "KITCHEN"
  | "BATH"
  | "ADUS"
  | "PAINTING"
  | "ROOFING"
  | "STUCCO"
  | "CONCRETE"
  | "TURF"
  | "LANDSCAPING"
  | "MONTHLY_YARD_MAINTENANCE"
  | "OTHER";
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

type Lead = {
  id: string;
  leadTypes: string[];
  description: string | null;
  status: LeadStatus;
  assignedSalesRepId: string | null;
  createdAt: string;
  updatedAt: string;
  closedDate: string | null;
  jobStatus: JobStatus | null;
  referrerFirstName: string | null;
  referrerLastName: string | null;
  referrerPhone: string | null;
  referrerEmail: string | null;
  referrerCustomerId: string | null;
  referrerIsCustomer: boolean;
  isMilitaryFirstResponder: boolean;
  isContractor: boolean;
  contractorLicenseNumber: string | null;
  hearAboutUs: string | null;
  hearAboutUsOther: string | null;
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
    sourceType: string;
  };
  assignedSalesRep: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdByUser: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  referrerCustomer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  } | null;
};

type User = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
};

type Appointment = {
  id: string;
  scheduledFor: string;
  siteAddressLine1: string | null;
  siteAddressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  salesRep: {
    id: string;
    name: string | null;
    email: string;
  };
};

type Quote = {
  id: string;
  quoteNumber: string | null;
  amount: number;
  currency: string;
  status: QuoteStatus;
  sentAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  appointmentId: string | null;
  files: Array<{
    id: string;
    fileUrl: string;
    fileType: string | null;
    uploadedAt: string;
  }>;
};

const lossReasonOptions = [
  "Price too high",
  "Went with competitor",
  "Timeline too long",
  "No response / Ghost",
  "Not interested",
] as const;

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salesReps, setSalesReps] = useState<User[]>([]);
  const [status, setStatus] = useState<LeadStatus>("NEW");
  const [assignedSalesRepId, setAssignedSalesRepId] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedLeadTypes, setSelectedLeadTypes] = useState<string[]>([]);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState<string>(lossReasonOptions[0]);
  const [closeJobStatus, setCloseJobStatus] = useState<JobStatus | null>(null);
  const [closingStatus, setClosingStatus] = useState<"WON" | "LOST" | null>(null);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);

  // Customer fields
  const [customerFirstName, setCustomerFirstName] = useState<string>("");
  const [customerLastName, setCustomerLastName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [customerAddressLine1, setCustomerAddressLine1] = useState<string>("");
  const [customerAddressLine2, setCustomerAddressLine2] = useState<string>("");
  const [customerCity, setCustomerCity] = useState<string>("");
  const [customerState, setCustomerState] = useState<string>("");
  const [customerZip, setCustomerZip] = useState<string>("");
  const [customerSourceType, setCustomerSourceType] =
    useState<string>("CALL_IN");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [creatingAppointment, setCreatingAppointment] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState({
    scheduledFor: "",
    siteAddressLine1: "",
    siteAddressLine2: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });
  const [editingAppointmentId, setEditingAppointmentId] = useState<
    string | null
  >(null);
  const [updatingAppointment, setUpdatingAppointment] = useState(false);
  const [appointmentEditForm, setAppointmentEditForm] = useState({
    scheduledFor: "",
    siteAddressLine1: "",
    siteAddressLine2: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
  });
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [creatingQuote, setCreatingQuote] = useState(false);
  const [quoteForm, setQuoteForm] = useState({
    quoteNumber: "",
    amount: "",
    currency: "USD",
    expiresAt: "",
    appointmentId: "",
    status: "DRAFT" as QuoteStatus,
  });
  const [notes, setNotes] = useState<
    Array<{
      id: string;
      content: string;
      createdAt: string;
      createdByUser: {
        id: string;
        name: string | null;
        email: string;
      };
    }>
  >([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const leadId = params.id as string;

  const leadTypeOptions: { value: LeadType; label: string }[] = [
    { value: "FLOOR", label: "Flooring" },
    { value: "CARPET", label: "Carpet" },
    { value: "TILE_STONE", label: "Tile/Stone" },
    { value: "MATERIALS", label: "Materials" },
    { value: "KITCHEN", label: "Kitchen" },
    { value: "BATH", label: "Bathroom" },
    { value: "ADUS", label: "ADU's" },
    { value: "PAINTING", label: "Painting" },
    { value: "ROOFING", label: "Roofing" },
    { value: "STUCCO", label: "Stucco" },
    { value: "CONCRETE", label: "Concrete" },
    { value: "TURF", label: "Turf" },
    { value: "LANDSCAPING", label: "Landscaping" },
    { value: "MONTHLY_YARD_MAINTENANCE", label: "Monthly Yard Maintenance" },
    { value: "OTHER", label: "Other" },
  ];

  const handleLeadTypeChange = (leadType: LeadType, checked: boolean) => {
    if (checked) {
      setSelectedLeadTypes([...selectedLeadTypes, leadType]);
    } else {
      setSelectedLeadTypes(
        selectedLeadTypes.filter((type) => type !== leadType)
      );
    }
  };

  const fetchLead = useCallback(async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}`);
      if (!response.ok) {
        if (response.status === 404) {
          router.push("/leads");
          return;
        }
        throw new Error("Failed to fetch lead");
      }
      const data = await response.json();
      setLead(data.lead);
      setStatus(data.lead.status);
      setAssignedSalesRepId(data.lead.assignedSalesRepId || "");
      setDescription(data.lead.description || "");
      setSelectedLeadTypes(data.lead.leadTypes || []);
      setJobStatus(data.lead.jobStatus || null);

      // Set customer fields
      setCustomerFirstName(data.lead.customer.firstName || "");
      setCustomerLastName(data.lead.customer.lastName || "");
      setCustomerPhone(data.lead.customer.phone || "");
      setCustomerEmail(data.lead.customer.email || "");
      setCustomerAddressLine1(data.lead.customer.addressLine1 || "");
      setCustomerAddressLine2(data.lead.customer.addressLine2 || "");
      setCustomerCity(data.lead.customer.city || "");
      setCustomerState(data.lead.customer.state || "");
      setCustomerZip(data.lead.customer.zip || "");
      setCustomerSourceType(data.lead.customer.sourceType || "CALL_IN");
    } catch (error) {
      console.error("Error fetching lead:", error);
    } finally {
      setLoading(false);
    }
  }, [leadId, router]);

  const fetchSalesReps = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch sales reps");
      const data = await response.json();
      setSalesReps(data.users);
    } catch (error) {
      console.error("Error fetching sales reps:", error);
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await fetch(`/api/appointments?leadId=${leadId}`);
      if (!response.ok) throw new Error("Failed to fetch appointments");
      const data = await response.json();
      setAppointments(data.appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  }, [leadId]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAppointment(true);

    try {
      // Determine sales rep ID: use assigned rep or current user if they're a sales rep or concierge
      let salesRepId = lead?.assignedSalesRepId;
      if (
        !salesRepId &&
        (session?.user.role === "SALES_REP" ||
          session?.user.role === "CONCIERGE")
      ) {
        salesRepId = session.user.id;
      }
      if (!salesRepId) {
        throw new Error("No sales rep assigned to this lead");
      }

      // Convert datetime-local string to ISO string with timezone
      // datetime-local gives us "YYYY-MM-DDTHH:mm" (local time, no timezone)
      // We need to convert it to a proper Date object and then to ISO string
      let scheduledForISO = appointmentForm.scheduledFor;
      if (appointmentForm.scheduledFor) {
        // Create a Date object from the local datetime string
        // This interprets it as local time
        const localDate = new Date(appointmentForm.scheduledFor);
        // Convert to ISO string which includes timezone info
        scheduledForISO = localDate.toISOString();
      }

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          salesRepId,
          scheduledFor: scheduledForISO,
          siteAddressLine1: appointmentForm.siteAddressLine1 || null,
          siteAddressLine2: appointmentForm.siteAddressLine2 || null,
          city: appointmentForm.city || null,
          state: appointmentForm.state || null,
          zip: appointmentForm.zip || null,
          notes: appointmentForm.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create appointment");
      }

      // Reset form and refresh
      setAppointmentForm({
        scheduledFor: "",
        siteAddressLine1: "",
        siteAddressLine2: "",
        city: "",
        state: "",
        zip: "",
        notes: "",
      });
      setShowAppointmentForm(false);
      fetchAppointments();
      fetchLead(); // Refresh lead to update status
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to create appointment");
    } finally {
      setCreatingAppointment(false);
    }
  };

  const handleStartEditAppointment = (appointment: Appointment) => {
    // Format scheduledFor for datetime-local input (YYYY-MM-DDTHH:mm)
    // The date from the server is in UTC, we need to convert it to local time
    const scheduledDate = new Date(appointment.scheduledFor);
    // Use local time methods to get the correct local time values
    const year = scheduledDate.getFullYear();
    const month = String(scheduledDate.getMonth() + 1).padStart(2, "0");
    const day = String(scheduledDate.getDate()).padStart(2, "0");
    const hours = String(scheduledDate.getHours()).padStart(2, "0");
    const minutes = String(scheduledDate.getMinutes()).padStart(2, "0");
    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    setAppointmentEditForm({
      scheduledFor: formattedDateTime,
      siteAddressLine1: appointment.siteAddressLine1 || "",
      siteAddressLine2: appointment.siteAddressLine2 || "",
      city: appointment.city || "",
      state: appointment.state || "",
      zip: appointment.zip || "",
      notes: appointment.notes || "",
    });
    setEditingAppointmentId(appointment.id);
  };

  const handleCancelEditAppointment = () => {
    setEditingAppointmentId(null);
    setAppointmentEditForm({
      scheduledFor: "",
      siteAddressLine1: "",
      siteAddressLine2: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
    });
  };

  const handleUpdateAppointment = async (
    e: React.FormEvent,
    appointmentId: string
  ) => {
    e.preventDefault();
    setUpdatingAppointment(true);

    try {
      // Convert datetime-local string to ISO string with timezone
      let scheduledForISO = appointmentEditForm.scheduledFor;
      if (appointmentEditForm.scheduledFor) {
        // Create a Date object from the local datetime string
        // This interprets it as local time
        const localDate = new Date(appointmentEditForm.scheduledFor);
        // Convert to ISO string which includes timezone info
        scheduledForISO = localDate.toISOString();
      }

      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledFor: scheduledForISO,
          siteAddressLine1: appointmentEditForm.siteAddressLine1 || null,
          siteAddressLine2: appointmentEditForm.siteAddressLine2 || null,
          city: appointmentEditForm.city || null,
          state: appointmentEditForm.state || null,
          zip: appointmentEditForm.zip || null,
          notes: appointmentEditForm.notes || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update appointment");
      }

      // Reset form and refresh
      handleCancelEditAppointment();
      fetchAppointments();
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to update appointment");
    } finally {
      setUpdatingAppointment(false);
    }
  };

  const handleUpdateAppointmentStatus = async (
    appointmentId: string,
    newStatus: AppointmentStatus
  ) => {
    if (
      !confirm(
        `Are you sure you want to mark this appointment as ${newStatus.replace(
          "_",
          " "
        )}?`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update appointment status");
      }

      fetchAppointments();
    } catch (error: any) {
      alert(error.message || "Failed to update appointment status");
    }
  };

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/quotes?leadId=${leadId}`);
      if (!response.ok) throw new Error("Failed to fetch quotes");
      const data = await response.json();
      setQuotes(data.quotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
    }
  }, [leadId]);

  const fetchNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/leads/${leadId}/notes`);
      if (!response.ok) throw new Error("Failed to fetch notes");
      const data = await response.json();
      setNotes(data.notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
    }
  }, [leadId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const response = await fetch(`/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newNote }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add note");
      }

      const data = await response.json();
      setNotes([data.note, ...notes]);
      setNewNote("");
    } catch (error: any) {
      console.error("Error adding note:", error);
      alert(error.message || "Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLead();
      fetchAppointments();
      fetchQuotes();
      fetchNotes();
    }
    if (session?.user.role === "ADMIN") {
      fetchSalesReps();
    }
  }, [
    leadId,
    session,
    fetchLead,
    fetchAppointments,
    fetchQuotes,
    fetchNotes,
    fetchSalesReps,
  ]);

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingQuote(true);

    try {
      const response = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          quoteNumber: quoteForm.quoteNumber,
          appointmentId: quoteForm.appointmentId || null,
          amount: quoteForm.amount,
          currency: quoteForm.currency,
          expiresAt: quoteForm.expiresAt || null,
          status: quoteForm.status,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create quote");
      }

      // Reset form and refresh
      setQuoteForm({
        quoteNumber: "",
        amount: "",
        currency: "USD",
        expiresAt: "",
        appointmentId: "",
        status: "DRAFT",
      });
      setShowQuoteForm(false);
      fetchQuotes();
      fetchLead(); // Refresh lead to update status
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to create quote");
    } finally {
      setCreatingQuote(false);
    }
  };

  const canCreateAppointment =
    (session?.user.role === "ADMIN" ||
      ((session?.user.role === "SALES_REP" ||
        session?.user.role === "CONCIERGE") &&
        lead?.assignedSalesRepId === session.user.id)) &&
    lead?.assignedSalesRepId;

  const canCreateQuote =
    (session?.user.role === "ADMIN" ||
      ((session?.user.role === "SALES_REP" ||
        session?.user.role === "CONCIERGE") &&
        lead?.assignedSalesRepId === session.user.id)) &&
    lead?.assignedSalesRepId;

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          assignedSalesRepId: assignedSalesRepId || null,
          description: description || null,
          leadTypes: selectedLeadTypes,
          jobStatus: status === "WON" ? (jobStatus || null) : null,
          // Customer fields
          firstName: customerFirstName,
          lastName: customerLastName,
          phone: customerPhone || null,
          email: customerEmail || null,
          addressLine1: customerAddressLine1 || null,
          addressLine2: customerAddressLine2 || null,
          city: customerCity || null,
          state: customerState || null,
          zip: customerZip || null,
          sourceType: customerSourceType,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update lead");
      }

      const data = await response.json();
      setLead(data.lead);
      setIsEditMode(false);
      router.refresh();
    } catch (error: any) {
      alert(error.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseLead = async (newStatus: "WON" | "LOST", reason?: string, jobStatus?: JobStatus | null) => {
    if (!lead) return;
    setClosing(true);
    setCloseError(null);
    try {
      const response = await fetch(`/api/leads/${leadId}/close`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          ...(newStatus === "LOST" ? { reason } : {}),
          ...(newStatus === "WON" && jobStatus ? { jobStatus } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to close lead" }));
        throw new Error(errorData.error || `Failed to close lead: ${response.statusText}`);
      }

      const data = await response.json();

      // Close the dialog first
      setShowCloseDialog(false);
      setClosingStatus(null);
      if (newStatus === "LOST") {
        setCloseReason(lossReasonOptions[0]);
      } else if (newStatus === "WON") {
        setCloseJobStatus(null);
      }

      // Update status immediately
      if (data.lead) {
        setStatus(data.lead.status as LeadStatus);
        setLead(data.lead);
        setJobStatus(data.lead.jobStatus || null);
      }
      
      // Exit edit mode immediately so UI updates
      setIsEditMode(false);
      
      // Refresh all data in the background (don't let errors here prevent the UI update)
      try {
        await Promise.all([fetchLead(), fetchNotes()]);
      } catch (refreshError) {
        console.error("Error refreshing data after close:", refreshError);
        // Don't throw - the status is already updated above
      }
      
      router.refresh();
    } catch (error: any) {
      console.error("Error closing lead:", error);
      setCloseError(error.message || "Failed to close lead");
      // Keep dialog open on error so user can try again
    } finally {
      setClosing(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original values
    if (lead) {
      setStatus(lead.status);
      setAssignedSalesRepId(lead.assignedSalesRepId || "");
      setDescription(lead.description || "");
      setSelectedLeadTypes(lead.leadTypes || []);
      setJobStatus(lead.jobStatus || null);
      setCustomerFirstName(lead.customer.firstName || "");
      setCustomerLastName(lead.customer.lastName || "");
      setCustomerPhone(lead.customer.phone || "");
      setCustomerEmail(lead.customer.email || "");
      setCustomerAddressLine1(lead.customer.addressLine1 || "");
      setCustomerAddressLine2(lead.customer.addressLine2 || "");
      setCustomerCity(lead.customer.city || "");
      setCustomerState(lead.customer.state || "");
      setCustomerZip(lead.customer.zip || "");
      setCustomerSourceType(lead.customer.sourceType || "CALL_IN");
    }
    setIsEditMode(false);
  };

  const handleDeleteLead = async () => {
    if (!lead) return;

    try {
      setDeleting(true);
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete lead");
      }

      // Redirect to leads list
      router.push("/leads");
    } catch (error: any) {
      alert(error.message || "Failed to delete lead");
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!lead) {
    return <div className="text-center py-8">Lead not found</div>;
  }

  // Check if this is a read-only view for sales rep or concierge
  const isReadOnly =
    (lead as any)._readOnly ||
    ((session?.user?.role === "SALES_REP" ||
      session?.user?.role === "CONCIERGE") &&
      lead.assignedSalesRepId !== session?.user?.id);

  const hasChanges =
    status !== lead.status ||
    assignedSalesRepId !== (lead.assignedSalesRepId || "") ||
    description !== (lead.description || "") ||
    JSON.stringify(selectedLeadTypes.sort()) !==
      JSON.stringify((lead.leadTypes || []).sort()) ||
    (status === "WON" && jobStatus !== (lead.jobStatus || null)) ||
    customerFirstName !== (lead.customer.firstName || "") ||
    customerLastName !== (lead.customer.lastName || "") ||
    customerPhone !== (lead.customer.phone || "") ||
    customerEmail !== (lead.customer.email || "") ||
    customerAddressLine1 !== (lead.customer.addressLine1 || "") ||
    customerAddressLine2 !== (lead.customer.addressLine2 || "") ||
    customerCity !== (lead.customer.city || "") ||
    customerState !== (lead.customer.state || "") ||
    customerZip !== (lead.customer.zip || "") ||
    customerSourceType !== lead.customer.sourceType;

  // Check if user can delete this lead (admin can delete any, sales rep/concierge can delete their own)
  // Only admins can delete leads
  const canDelete = !isReadOnly && session?.user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/leads">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Lead Details</h1>
            <p className="text-muted-foreground">
              {lead.customer.firstName} {lead.customer.lastName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isReadOnly ? (
            <div className="text-sm text-muted-foreground flex items-center">
              Read-only view - You can only view customer name and assignment
            </div>
          ) : (
            <>
              {!isEditMode ? (
                <Button variant="outline" onClick={() => setIsEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  {hasChanges && (
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          {canDelete && (
            <>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting || isEditMode}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lead
              </Button>
              <AlertDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Lead</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this lead for{" "}
                      <strong>
                        {lead.customer.firstName} {lead.customer.lastName}
                      </strong>
                      ?
                      <br />
                      <br />
                      <strong className="text-destructive">
                        This action cannot be undone.
                      </strong>{" "}
                      This will also delete all associated appointments, quotes,
                      and notes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteLead}
                      disabled={deleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? "Deleting..." : "Delete Lead"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {isReadOnly ? (
        // Read-only view for sales reps viewing non-assigned leads
        <Card>
          <CardHeader>
            <CardTitle>Lead Information (Read-Only)</CardTitle>
            <CardDescription>
              You can view this lead to check who it&apos;s assigned to, but
              cannot edit it.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Customer Name
              </p>
              <p className="text-lg">
                {lead.customer.firstName} {lead.customer.lastName}
              </p>
            </div>
            {lead.assignedSalesRep && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assigned To
                </p>
                <p>
                  {lead.assignedSalesRep.name || lead.assignedSalesRep.email}
                </p>
              </div>
            )}
            {!lead.assignedSalesRep && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assigned To
                </p>
                <p className="text-muted-foreground">Unassigned</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <AlertDialog
            open={showCloseDialog}
            onOpenChange={(open) => {
              setShowCloseDialog(open);
              if (!open) {
                setClosingStatus(null);
                setCloseError(null);
                setCloseReason(lossReasonOptions[0]);
                setCloseJobStatus(null);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {closingStatus === "WON" ? "Mark Lead as Won" : "Mark Lead as Lost"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {closingStatus === "WON"
                    ? "Select the job status for this won lead. A note will be added automatically."
                    : "Select a reason for closing this lead. A note will be added automatically."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-3">
                {closingStatus === "LOST" ? (
                  <>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Loss Reason
                    </Label>
                    <Select value={closeReason} onChange={(e) => setCloseReason(e.target.value)}>
                      {lossReasonOptions.map((reason) => (
                        <option key={reason} value={reason}>
                          {reason}
                        </option>
                      ))}
                    </Select>
                  </>
                ) : (
                  <>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Job Status
                    </Label>
                    <Select
                      value={closeJobStatus || ""}
                      onChange={(e) =>
                        setCloseJobStatus(e.target.value ? (e.target.value as JobStatus) : null)
                      }
                    >
                      <option value="">Not set</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="DONE">Done</option>
                    </Select>
                  </>
                )}
                {closeError && <p className="text-sm text-destructive">{closeError}</p>}
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={closing}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (closingStatus === "LOST" && closeReason && !closing) {
                      handleCloseLead("LOST", closeReason);
                    } else if (closingStatus === "WON" && !closing) {
                      handleCloseLead("WON", undefined, closeJobStatus);
                    }
                  }}
                  disabled={
                    closing ||
                    (closingStatus === "LOST" && !closeReason) ||
                    (closingStatus === "WON" && false) // Job status is optional for WON
                  }
                >
                  {closing ? "Closing..." : "Confirm Close"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditMode ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerFirstName">First Name *</Label>
                      <Input
                        id="customerFirstName"
                        value={customerFirstName}
                        onChange={(e) => setCustomerFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerLastName">Last Name *</Label>
                      <Input
                        id="customerLastName"
                        value={customerLastName}
                        onChange={(e) => setCustomerLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="customerPhone">Phone</Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerEmail">Email</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerAddressLine1">Address Line 1</Label>
                    <Input
                      id="customerAddressLine1"
                      value={customerAddressLine1}
                      onChange={(e) => setCustomerAddressLine1(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="customerAddressLine2">Address Line 2</Label>
                    <Input
                      id="customerAddressLine2"
                      value={customerAddressLine2}
                      onChange={(e) => setCustomerAddressLine2(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="customerCity">City</Label>
                      <Input
                        id="customerCity"
                        value={customerCity}
                        onChange={(e) => setCustomerCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerState">State</Label>
                      <Input
                        id="customerState"
                        value={customerState}
                        onChange={(e) => setCustomerState(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerZip">ZIP</Label>
                      <Input
                        id="customerZip"
                        value={customerZip}
                        onChange={(e) => setCustomerZip(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="customerSourceType">Source Type *</Label>
                    <Select
                      id="customerSourceType"
                      value={customerSourceType}
                      onChange={(e) => setCustomerSourceType(e.target.value)}
                      required
                    >
                      <option value="CALL_IN">Call In</option>
                      <option value="WALK_IN">Walk In</option>
                      <option value="REFERRAL">Referral</option>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Name
                    </p>
                    <p className="text-lg">
                      {lead.customer.firstName} {lead.customer.lastName}
                    </p>
                  </div>
                  {lead.customer.phone && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Phone
                      </p>
                      <p>{formatPhoneNumber(lead.customer.phone)}</p>
                    </div>
                  )}
                  {lead.customer.email && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Email
                      </p>
                      <p>{lead.customer.email}</p>
                    </div>
                  )}
                  {(lead.customer.addressLine1 ||
                    lead.customer.city ||
                    lead.customer.state) && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Address
                      </p>
                      <p>
                        {lead.customer.addressLine1}
                        {lead.customer.addressLine2 && (
                          <>, {lead.customer.addressLine2}</>
                        )}
                        <br />
                        {lead.customer.city && <>{lead.customer.city}, </>}
                        {lead.customer.state} {lead.customer.zip}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Source
                    </p>
                    <p>{lead.customer.sourceType.replace("_", " ")}</p>
                  </div>
                  {(lead.isMilitaryFirstResponder || lead.isContractor) && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Additional Information
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {lead.isMilitaryFirstResponder && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Military/First Responder
                          </span>
                        )}
                        {lead.isContractor && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Contractor
                          </span>
                        )}
                      </div>
                      {lead.isContractor && lead.contractorLicenseNumber && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            License #
                          </p>
                          <p className="text-sm">
                            {lead.contractorLicenseNumber}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Lead Information */}
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isEditMode ? (
                <>
                  <div>
                    <Label
                      htmlFor="status"
                      className="text-sm font-medium text-muted-foreground mb-2"
                    >
                      Status
                    </Label>
                    <Select
                      id="status"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as LeadStatus)}
                    >
                      <option value="NEW">New</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="APPOINTMENT_SET">Appointment Set</option>
                      <option value="QUOTED">Quoted</option>
                      <option value="WON" disabled>
                        Won
                      </option>
                      <option value="LOST" disabled>
                        Lost
                      </option>
                    </Select>
                  </div>

                  {/* Job Status - Only show when status is WON */}
                  {status === "WON" && (
                    <div>
                      <Label
                        htmlFor="jobStatus"
                        className="text-sm font-medium text-muted-foreground mb-2"
                      >
                        Job Status
                      </Label>
                      <Select
                        id="jobStatus"
                        value={jobStatus || ""}
                        onChange={(e) => setJobStatus(e.target.value ? (e.target.value as JobStatus) : null)}
                      >
                        <option value="">Not set</option>
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="DONE">Done</option>
                      </Select>
                    </div>
                  )}
                  
                  {/* Close Lead Section - Only show when editing and status is not WON or LOST */}
                  {status !== "WON" && status !== "LOST" && (
                    <div className="pt-3 border-t">
                      <Label className="text-sm font-medium text-muted-foreground mb-2">
                        Close Lead
                      </Label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Mark this lead as won or lost. Lost reasons will be added to notes automatically.
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                          onClick={() => {
                            setClosingStatus("WON");
                            setShowCloseDialog(true);
                            setCloseError(null);
                            setCloseJobStatus(null);
                          }}
                          disabled={closing}
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Won
                        </Button>
                        <Button
                          variant="outline"
                          className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
                          onClick={() => {
                            setClosingStatus("LOST");
                            setShowCloseDialog(true);
                            setCloseError(null);
                          }}
                          disabled={closing}
                          size="sm"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Mark as Lost
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Status
                    </p>
                    <p>{status.replace("_", " ")}</p>
                  </div>
                  {status === "WON" && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Job Status
                      </p>
                      <p>{jobStatus ? jobStatus.replace("_", " ") : "Not set"}</p>
                    </div>
                  )}
                </>
              )}

              {isEditMode ? (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground mb-2">
                    Lead Types
                  </Label>
                  <div className="mt-2 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {leadTypeOptions.map((option) => (
                        <div
                          key={option.value}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`leadType-${option.value}`}
                            checked={selectedLeadTypes.includes(option.value)}
                            onChange={(e) =>
                              handleLeadTypeChange(
                                option.value,
                                e.target.checked
                              )
                            }
                          />
                          <Label
                            htmlFor={`leadType-${option.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Lead Types
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {(lead.leadTypes || []).map((type: string, idx: number) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground"
                      >
                        {formatLeadType(type)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {isEditMode ? (
                <>
                  {session?.user.role === "ADMIN" && (
                    <div>
                      <Label
                        htmlFor="assignedSalesRep"
                        className="text-sm font-medium text-muted-foreground mb-2"
                      >
                        Assigned To
                      </Label>
                      <Select
                        id="assignedSalesRep"
                        value={assignedSalesRepId}
                        onChange={(e) => setAssignedSalesRepId(e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {salesReps.map((rep) => (
                          <option key={rep.id} value={rep.id}>
                            {rep.name || rep.email}{" "}
                            {rep.role === "ADMIN" ? "(Admin)" : "(Sales Rep)"}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-muted-foreground mb-2"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter lead description..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                </>
              ) : (
                <>
                  {lead.assignedSalesRep && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Assigned To
                      </p>
                      <p>
                        {lead.assignedSalesRep.name ||
                          lead.assignedSalesRep.email}
                      </p>
                    </div>
                  )}
                  {lead.createdByUser && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Created By
                      </p>
                      <p>
                        {lead.createdByUser.name || lead.createdByUser.email}
                      </p>
                    </div>
                  )}
                  {lead.description && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Description
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {lead.description}
                      </p>
                    </div>
                  )}
                </>
              )}

              {lead.customer.sourceType === "REFERRAL" &&
                (lead.referrerFirstName ||
                  lead.referrerLastName ||
                  lead.referrerPhone ||
                  lead.referrerEmail) && (
                  <div className="pt-3 border-t">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      Referred By
                    </p>
                    <div className="space-y-1">
                      {(lead.referrerFirstName || lead.referrerLastName) && (
                        <p className="text-sm font-semibold">
                          {lead.referrerFirstName} {lead.referrerLastName}
                        </p>
                      )}
                      {lead.referrerPhone && (
                        <p className="text-sm text-muted-foreground">
                          Phone: {formatPhoneNumber(lead.referrerPhone)}
                        </p>
                      )}
                      {lead.referrerEmail && (
                        <p className="text-sm text-muted-foreground">
                          Email: {lead.referrerEmail}
                        </p>
                      )}
                      {lead.referrerIsCustomer && lead.referrerCustomer && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 px-2 py-1 rounded">
                            ✓ Existing Customer
                          </span>
                          <Link
                            href={`/customers/${lead.referrerCustomer.id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            View Customer Profile
                          </Link>
                        </div>
                      )}
                      {lead.referrerIsCustomer === false && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Not in system
                        </p>
                      )}
                    </div>
                  </div>
                )}

              {lead.hearAboutUs && (
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-muted-foreground">
                    Where did you hear about us?
                  </p>
                  <p className="text-sm">
                    {lead.hearAboutUs === "YELP" && "Yelp"}
                    {lead.hearAboutUs === "FACEBOOK" && "Facebook"}
                    {lead.hearAboutUs === "DRIVING_BY" && "Driving By"}
                    {lead.hearAboutUs === "OTHER" &&
                      (lead.hearAboutUsOther || "Other")}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t -mb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Created
                    </p>
                    <p className="text-sm">
                      {new Date(lead.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Updated
                    </p>
                    <p className="text-sm">
                      {new Date(lead.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          </div>
        </>
      )}

      {/* Appointments Section - Only show if not read-only */}
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Appointments</CardTitle>
                <CardDescription>
                  Schedule and manage appointments for this lead
                </CardDescription>
              </div>
              {canCreateAppointment && (
                <Button
                  onClick={() => setShowAppointmentForm(!showAppointmentForm)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Appointment
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Appointment Form */}
            {showAppointmentForm && canCreateAppointment && (
              <form
                onSubmit={handleCreateAppointment}
                className="space-y-4 p-4 border rounded-md bg-muted/50"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="scheduledFor">Date & Time *</Label>
                    <Input
                      id="scheduledFor"
                      type="datetime-local"
                      value={appointmentForm.scheduledFor}
                      onChange={(e) =>
                        setAppointmentForm({
                          ...appointmentForm,
                          scheduledFor: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="siteAddressLine1">Site Address Line 1</Label>
                  <Input
                    id="siteAddressLine1"
                    value={appointmentForm.siteAddressLine1}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        siteAddressLine1: e.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="siteAddressLine2">Site Address Line 2</Label>
                  <Input
                    id="siteAddressLine2"
                    value={appointmentForm.siteAddressLine2}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        siteAddressLine2: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={appointmentForm.city}
                      onChange={(e) =>
                        setAppointmentForm({
                          ...appointmentForm,
                          city: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={appointmentForm.state}
                      onChange={(e) =>
                        setAppointmentForm({
                          ...appointmentForm,
                          state: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">ZIP</Label>
                    <Input
                      id="zip"
                      value={appointmentForm.zip}
                      onChange={(e) =>
                        setAppointmentForm({
                          ...appointmentForm,
                          zip: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={appointmentForm.notes}
                    onChange={(e) =>
                      setAppointmentForm({
                        ...appointmentForm,
                        notes: e.target.value,
                      })
                    }
                    rows={3}
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={creatingAppointment}>
                    {creatingAppointment ? "Creating..." : "Create Appointment"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAppointmentForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Appointments List */}
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No appointments scheduled yet.
                {canCreateAppointment && " Create one to get started."}
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((appointment) => {
                  const isEditing = editingAppointmentId === appointment.id;
                  const canEdit =
                    session?.user.role === "ADMIN" ||
                    ((session?.user.role === "SALES_REP" ||
                      session?.user.role === "CONCIERGE") &&
                      appointment.salesRep.id === session.user.id);

                  return (
                    <div
                      key={appointment.id}
                      className="p-4 border rounded-md hover:bg-muted/50 transition-colors"
                    >
                      {isEditing ? (
                        <form
                          onSubmit={(e) =>
                            handleUpdateAppointment(e, appointment.id)
                          }
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label
                                htmlFor={`edit-scheduledFor-${appointment.id}`}
                              >
                                Date & Time *
                              </Label>
                              <Input
                                id={`edit-scheduledFor-${appointment.id}`}
                                type="datetime-local"
                                value={appointmentEditForm.scheduledFor}
                                onChange={(e) =>
                                  setAppointmentEditForm({
                                    ...appointmentEditForm,
                                    scheduledFor: e.target.value,
                                  })
                                }
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <Label
                              htmlFor={`edit-siteAddressLine1-${appointment.id}`}
                            >
                              Site Address Line 1
                            </Label>
                            <Input
                              id={`edit-siteAddressLine1-${appointment.id}`}
                              value={appointmentEditForm.siteAddressLine1}
                              onChange={(e) =>
                                setAppointmentEditForm({
                                  ...appointmentEditForm,
                                  siteAddressLine1: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div>
                            <Label
                              htmlFor={`edit-siteAddressLine2-${appointment.id}`}
                            >
                              Site Address Line 2
                            </Label>
                            <Input
                              id={`edit-siteAddressLine2-${appointment.id}`}
                              value={appointmentEditForm.siteAddressLine2}
                              onChange={(e) =>
                                setAppointmentEditForm({
                                  ...appointmentEditForm,
                                  siteAddressLine2: e.target.value,
                                })
                              }
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor={`edit-city-${appointment.id}`}>
                                City
                              </Label>
                              <Input
                                id={`edit-city-${appointment.id}`}
                                value={appointmentEditForm.city}
                                onChange={(e) =>
                                  setAppointmentEditForm({
                                    ...appointmentEditForm,
                                    city: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-state-${appointment.id}`}>
                                State
                              </Label>
                              <Input
                                id={`edit-state-${appointment.id}`}
                                value={appointmentEditForm.state}
                                onChange={(e) =>
                                  setAppointmentEditForm({
                                    ...appointmentEditForm,
                                    state: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor={`edit-zip-${appointment.id}`}>
                                ZIP
                              </Label>
                              <Input
                                id={`edit-zip-${appointment.id}`}
                                value={appointmentEditForm.zip}
                                onChange={(e) =>
                                  setAppointmentEditForm({
                                    ...appointmentEditForm,
                                    zip: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`edit-notes-${appointment.id}`}>
                              Notes
                            </Label>
                            <Textarea
                              id={`edit-notes-${appointment.id}`}
                              value={appointmentEditForm.notes}
                              onChange={(e) =>
                                setAppointmentEditForm({
                                  ...appointmentEditForm,
                                  notes: e.target.value,
                                })
                              }
                              rows={3}
                            />
                          </div>

                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              disabled={updatingAppointment}
                            >
                              {updatingAppointment
                                ? "Updating..."
                                : "Save Changes"}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCancelEditAppointment}
                              disabled={updatingAppointment}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              {/* Date/Time and Status */}
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-semibold text-base">
                                    {new Date(
                                      appointment.scheduledFor
                                    ).toLocaleString(undefined, {
                                      weekday: "short",
                                      year: "numeric",
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                                    appointment.status === "COMPLETED"
                                      ? "bg-green-100 text-green-800"
                                      : appointment.status === "CANCELLED"
                                      ? "bg-red-100 text-red-800"
                                      : appointment.status === "NO_SHOW"
                                      ? "bg-orange-100 text-orange-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {appointment.status.replace("_", " ")}
                                </span>
                              </div>

                              {/* Address */}
                              <div className="space-y-1">
                                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Site Address
                                </div>
                                {appointment.siteAddressLine1 ||
                                appointment.city ? (
                                  <div className="text-sm">
                                    {appointment.siteAddressLine1 && (
                                      <div>{appointment.siteAddressLine1}</div>
                                    )}
                                    {appointment.siteAddressLine2 && (
                                      <div>{appointment.siteAddressLine2}</div>
                                    )}
                                    {(appointment.city ||
                                      appointment.state ||
                                      appointment.zip) && (
                                      <div>
                                        {appointment.city}
                                        {appointment.state &&
                                          `, ${appointment.state}`}
                                        {appointment.zip &&
                                          ` ${appointment.zip}`}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm text-muted-foreground italic">
                                    No address provided
                                  </div>
                                )}
                              </div>

                              {/* Notes */}
                              {appointment.notes && (
                                <div className="space-y-1">
                                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    Notes
                                  </div>
                                  <div className="text-sm bg-muted/50 p-2 rounded-md">
                                    {appointment.notes}
                                  </div>
                                </div>
                              )}

                              {/* Sales Rep */}
                              <div className="text-xs text-muted-foreground">
                                Sales Rep:{" "}
                                <span className="font-medium">
                                  {appointment.salesRep.name ||
                                    appointment.salesRep.email}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-2 ml-4">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleStartEditAppointment(appointment)
                                  }
                                  className="h-8"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Status Action Buttons - Only show for scheduled appointments */}
                          {appointment.status === "SCHEDULED" && canEdit && (
                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdateAppointmentStatus(
                                    appointment.id,
                                    "COMPLETED"
                                  )
                                }
                                className="flex-1 text-green-700 border-green-200 hover:bg-green-50"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Complete
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdateAppointmentStatus(
                                    appointment.id,
                                    "NO_SHOW"
                                  )
                                }
                                className="flex-1 text-orange-700 border-orange-200 hover:bg-orange-50"
                              >
                                No Show
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleUpdateAppointmentStatus(
                                    appointment.id,
                                    "CANCELLED"
                                  )
                                }
                                className="flex-1 text-red-700 border-red-200 hover:bg-red-50"
                              >
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quotes Section - Only show if not read-only */}
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Quotes</CardTitle>
                <CardDescription>
                  Create and manage quotes for this lead
                </CardDescription>
              </div>
              {canCreateQuote && (
                <Button
                  onClick={() => setShowQuoteForm(!showQuoteForm)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Quote
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* New Quote Form */}
            {showQuoteForm && canCreateQuote && (
              <form
                onSubmit={handleCreateQuote}
                className="space-y-4 p-4 border rounded-md bg-muted/50"
              >
                <div>
                  <Label htmlFor="quoteNumber">Estimate # *</Label>
                  <Input
                    id="quoteNumber"
                    type="text"
                    value={quoteForm.quoteNumber}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        quoteNumber: e.target.value,
                      })
                    }
                    required
                    placeholder="Enter estimate number"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={quoteForm.amount}
                      onChange={(e) =>
                        setQuoteForm({
                          ...quoteForm,
                          amount: e.target.value,
                        })
                      }
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      id="currency"
                      value={quoteForm.currency}
                      onChange={(e) =>
                        setQuoteForm({
                          ...quoteForm,
                          currency: e.target.value,
                        })
                      }
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiresAt">Expires At</Label>
                    <Input
                      id="expiresAt"
                      type="datetime-local"
                      value={quoteForm.expiresAt}
                      onChange={(e) =>
                        setQuoteForm({
                          ...quoteForm,
                          expiresAt: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="appointmentId">Related Appointment</Label>
                    <Select
                      id="appointmentId"
                      value={quoteForm.appointmentId}
                      onChange={(e) =>
                        setQuoteForm({
                          ...quoteForm,
                          appointmentId: e.target.value,
                        })
                      }
                    >
                      <option value="">None</option>
                      {appointments.map((apt) => (
                        <option key={apt.id} value={apt.id}>
                          {new Date(apt.scheduledFor).toLocaleString()}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={quoteForm.status}
                    onChange={(e) =>
                      setQuoteForm({
                        ...quoteForm,
                        status: e.target.value as QuoteStatus,
                      })
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="SENT">Sent</option>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={creatingQuote}>
                    {creatingQuote ? "Creating..." : "Create Quote"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowQuoteForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {/* Quotes List */}
            {quotes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No quotes created yet.
                {canCreateQuote && " Create one to get started."}
              </div>
            ) : (
              <div className="space-y-3">
                {quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="p-4 border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/quotes/${quote.id}`} className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <DollarSign className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold text-lg">
                            {new Intl.NumberFormat("en-US", {
                              style: "currency",
                              currency: quote.currency,
                            }).format(quote.amount)}
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              quote.status === "ACCEPTED"
                                ? "bg-green-100 text-green-800"
                                : quote.status === "DECLINED"
                                ? "bg-red-100 text-red-800"
                                : quote.status === "EXPIRED"
                                ? "bg-orange-100 text-orange-800"
                                : quote.status === "SENT"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {quote.status}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          {quote.quoteNumber && (
                            <div>Estimate #: {quote.quoteNumber}</div>
                          )}
                          <div>
                            Created:{" "}
                            {new Date(quote.createdAt).toLocaleString()}
                          </div>
                          {quote.sentAt && (
                            <div>
                              Sent: {new Date(quote.sentAt).toLocaleString()}
                            </div>
                          )}
                          {quote.expiresAt && (
                            <div>
                              Expires:{" "}
                              {new Date(quote.expiresAt).toLocaleString()}
                            </div>
                          )}
                          {quote.files.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <FileText className="h-4 w-4" />
                              <span>{quote.files.length} file(s)</span>
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="flex flex-col gap-2">
                        <Link href={`/quotes/${quote.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            {quote.files.length > 0
                              ? "Manage Files"
                              : "Upload Files"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes Section - Only show if not read-only */}
      {!isReadOnly && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Notes
            </CardTitle>
            <CardDescription>
              Add notes and comments about this lead. All notes are timestamped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-3">
              <div>
                <Label htmlFor="newNote">Add a Note</Label>
                <Textarea
                  id="newNote"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Enter your note here..."
                  rows={3}
                  required
                />
              </div>
              <Button type="submit" disabled={addingNote || !newNote.trim()}>
                {addingNote ? "Adding..." : "Add Note"}
              </Button>
            </form>

            {/* Notes List */}
            <div className="space-y-4 mt-6">
              {notes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No notes yet. Add one to get started.
                </div>
              ) : (
                notes.map((note) => (
                  <div
                    key={note.id}
                    className="border rounded-lg p-4 bg-card space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm whitespace-pre-wrap">
                          {note.content}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                      <span className="font-medium">
                        {note.createdByUser.name || note.createdByUser.email}
                      </span>
                      <span>•</span>
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
