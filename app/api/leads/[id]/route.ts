import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadStatus, LeadType, SourceType, JobStatus } from "@prisma/client";
import { logInfo, logError, logAction } from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        customer: true,
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        referrerCustomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        // Include createdByUser relation - using type assertion since Prisma types may be out of sync during build
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      } as any,
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // SALES_REP and CONCIERGE can view any lead, but with limited data if not assigned to them
    if (
      (session.user.role === "SALES_REP" ||
        session.user.role === "CONCIERGE") &&
      lead.assignedSalesRepId !== session.user.id
    ) {
      // Return limited lead data for read-only viewing
      // Type assertion: customer is always included as a single object (not an array)
      const leadWithCustomer = lead as typeof lead & {
        customer: {
          id: string;
          firstName: string;
          lastName: string;
        };
      };
      const limitedLead = {
        id: lead.id,
        assignedSalesRepId: lead.assignedSalesRepId,
        customer: {
          id: leadWithCustomer.customer.id,
          firstName: leadWithCustomer.customer.firstName,
          lastName: leadWithCustomer.customer.lastName,
        },
        assignedSalesRep: lead.assignedSalesRep || null,
        status: lead.status,
        createdAt: lead.createdAt,
        // Mark as read-only for frontend
        _readOnly: true,
      };
      return NextResponse.json({ lead: limitedLead }, { status: 200 });
    }

    return NextResponse.json({ lead }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch lead" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      assignedSalesRepId,
      description,
      leadTypes,
      jobStatus,
      // Customer fields
      firstName,
      lastName,
      phone,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      sourceType,
    } = body;

    // Check if lead exists and user has permission
    const existingLead = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // SALES_REP and CONCIERGE can only update their own leads
    if (
      (session.user.role === "SALES_REP" ||
        session.user.role === "CONCIERGE") &&
      existingLead.assignedSalesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only ADMIN can assign or change sales rep assignment
    // Check if assignment is being changed (new value different from existing, or being set when currently null)
    if (
      assignedSalesRepId !== undefined &&
      assignedSalesRepId !== existingLead.assignedSalesRepId &&
      session.user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Only admins can assign sales reps" },
        { status: 403 }
      );
    }

    // Only ADMIN can set status to LOST or WON
    if (status && (status === "LOST" || status === "WON") && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can set lead status to Lost or Won" },
        { status: 403 }
      );
    }

    // Validate jobStatus - only allowed for WON leads
    if (jobStatus !== undefined) {
      if (status && status !== "WON" && existingLead.status !== "WON") {
        return NextResponse.json(
          { error: "Job status can only be set for leads with WON status" },
          { status: 400 }
        );
      }
      if (existingLead.status !== "WON" && status !== "WON") {
        return NextResponse.json(
          { error: "Job status can only be set for leads with WON status" },
          { status: 400 }
        );
      }
      if (jobStatus && !["SCHEDULED", "IN_PROGRESS", "DONE"].includes(jobStatus)) {
        return NextResponse.json(
          { error: "Invalid job status. Must be SCHEDULED, IN_PROGRESS, or DONE" },
          { status: 400 }
        );
      }
    }

    // Verify assigned user exists and is either ADMIN or SALES_REP
    if (assignedSalesRepId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedSalesRepId },
      });
      if (
        !assignedUser ||
        (assignedUser.role !== "SALES_REP" &&
          assignedUser.role !== "CONCIERGE" &&
          assignedUser.role !== "ADMIN")
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid user - can only assign to Admin, Sales Rep, or Concierge users",
          },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (status) {
      updateData.status = status as LeadStatus;
    }
    if (assignedSalesRepId !== undefined) {
      updateData.assignedSalesRepId = assignedSalesRepId || null;
    }
    if (description !== undefined) {
      updateData.description = description || null;
    }
    if (leadTypes !== undefined) {
      // Validate lead types
      const validLeadTypes = Object.values(LeadType);
      const providedTypes = Array.isArray(leadTypes) ? leadTypes : [];
      const invalidTypes = providedTypes.filter(
        (type: string) => !validLeadTypes.includes(type as LeadType)
      );

      if (invalidTypes.length > 0) {
        return NextResponse.json(
          { error: `Invalid lead types: ${invalidTypes.join(", ")}` },
          { status: 400 }
        );
      }

      updateData.leadTypes = providedTypes as LeadType[];
    }
    if (jobStatus !== undefined) {
      updateData.jobStatus = jobStatus ? (jobStatus as JobStatus) : null;
    }

    // Update customer if customer fields are provided
    if (
      firstName ||
      lastName ||
      phone !== undefined ||
      email !== undefined ||
      addressLine1 !== undefined ||
      addressLine2 !== undefined ||
      city !== undefined ||
      state !== undefined ||
      zip !== undefined ||
      sourceType
    ) {
      const customerUpdateData: any = {};
      if (firstName) customerUpdateData.firstName = firstName;
      if (lastName) customerUpdateData.lastName = lastName;
      if (phone !== undefined) customerUpdateData.phone = phone || null;
      if (email !== undefined) customerUpdateData.email = email || null;
      if (addressLine1 !== undefined)
        customerUpdateData.addressLine1 = addressLine1 || null;
      if (addressLine2 !== undefined)
        customerUpdateData.addressLine2 = addressLine2 || null;
      if (city !== undefined) customerUpdateData.city = city || null;
      if (state !== undefined) customerUpdateData.state = state || null;
      if (zip !== undefined) customerUpdateData.zip = zip || null;
      if (sourceType) customerUpdateData.sourceType = sourceType as SourceType;

      // Validate required customer fields
      if (firstName || lastName) {
        if (!firstName || !lastName) {
          return NextResponse.json(
            { error: "Both first name and last name are required" },
            { status: 400 }
          );
        }
      }

      // Update the customer
      await prisma.customer.update({
        where: { id: existingLead.customerId },
        data: customerUpdateData,
      });
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
      include: {
        customer: true,
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        referrerCustomer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        // Include createdByUser relation - using type assertion since Prisma types may be out of sync during build
        createdByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      } as any,
    });

    // Type assertion: customer is always included as a single object (not an array)
    const leadWithCustomer = lead as typeof lead & {
      customer: {
        firstName: string;
        lastName: string;
      };
    };
    logAction("Lead updated", session.user.id, session.user.role, {
      leadId: params.id,
      customerName: `${leadWithCustomer.customer.firstName} ${leadWithCustomer.customer.lastName}`,
      statusChanged: status
        ? { from: existingLead.status, to: status }
        : undefined,
      assignedChanged:
        assignedSalesRepId !== undefined
          ? {
              from: existingLead.assignedSalesRepId,
              to: assignedSalesRepId,
            }
          : undefined,
    });

    return NextResponse.json({ lead }, { status: 200 });
  } catch (error: any) {
    const session = await getServerSession(authOptions);
    logError("Error updating lead", error, {
      leadId: params.id,
      userId: session?.user?.id,
      userRole: session?.user?.role,
    });
    return NextResponse.json(
      { error: error.message || "Failed to update lead" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Only admins can delete leads
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete leads" },
        { status: 403 }
      );
    }

    // Delete the lead (cascading deletes will handle related records)
    // Based on schema: appointments, quotes, and notes will be deleted via onDelete: Cascade
    await prisma.lead.delete({
      where: { id: params.id },
    });

    return NextResponse.json(
      { message: "Lead deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete lead" },
      { status: 500 }
    );
  }
}
