import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SourceType, LeadType, LeadStatus } from "@prisma/client";
import { logInfo, logError, logAction } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logInfo("POST /api/leads - Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logInfo("POST /api/leads - Creating new lead", {
      userId: session.user.name,
      userRole: session.user.role,
    });

    const body = await request.json();
    const {
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
      leadTypes,
      description,
      // Referral fields
      referrerFirstName,
      referrerLastName,
      referrerPhone,
      referrerEmail,
      // Customer classification
      isMilitaryFirstResponder,
      isContractor,
      contractorLicenseNumber,
      // Marketing attribution
      hearAboutUs,
      hearAboutUsOther,
    } = body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !sourceType ||
      !leadTypes ||
      leadTypes.length === 0
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate: if OTHER is selected, description is required
    if (leadTypes.includes("OTHER") && !description?.trim()) {
      return NextResponse.json(
        { error: "Description is required when 'Other' is selected" },
        { status: 400 }
      );
    }

    // Validate: if contractor is selected, license number is required
    if (isContractor && !contractorLicenseNumber?.trim()) {
      return NextResponse.json(
        {
          error:
            "Contractor License Number is required when 'Contractor' is selected",
        },
        { status: 400 }
      );
    }

    // Check if customer already exists (by phone or email)
    let customer = null;
    if (phone || email) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])],
        },
      });
    }

    // Create or update customer
    if (customer) {
      // Update existing customer with new info if provided
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: firstName || customer.firstName,
          lastName: lastName || customer.lastName,
          phone: phone || customer.phone,
          email: email || customer.email,
          addressLine1: addressLine1 || customer.addressLine1,
          addressLine2: addressLine2 || customer.addressLine2,
          city: city || customer.city,
          state: state || customer.state,
          zip: zip || customer.zip,
          sourceType: sourceType || customer.sourceType,
        },
      });
    } else {
      // Create new customer
      customer = await prisma.customer.create({
        data: {
          firstName,
          lastName,
          phone: phone || null,
          email: email || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          sourceType: sourceType as SourceType,
        },
      });
    }

    // Handle referral information if sourceType is REFERRAL
    let referrerCustomerId: string | null = null;
    let referrerIsCustomer = false;

    if (sourceType === "REFERRAL" && (referrerPhone || referrerEmail)) {
      // Check if referrer is an existing customer
      const referrerCustomer = await prisma.customer.findFirst({
        where: {
          OR: [
            ...(referrerPhone ? [{ phone: referrerPhone }] : []),
            ...(referrerEmail ? [{ email: referrerEmail }] : []),
          ],
        },
      });

      if (referrerCustomer) {
        referrerCustomerId = referrerCustomer.id;
        referrerIsCustomer = true;
      }
    }

    // Auto-assign lead to creator if they are a SALES_REP or ADMIN
    // Only assign if the user has a role that can be assigned (SALES_REP or ADMIN)
    const shouldAutoAssign =
      session.user.role === "SALES_REP" || session.user.role === "ADMIN";
    const assignedSalesRepId = shouldAutoAssign ? session.user.id : null;
    // Set status to ASSIGNED if auto-assigned, otherwise NEW
    const initialStatus: LeadStatus = assignedSalesRepId ? "ASSIGNED" : "NEW";

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        customerId: customer.id,
        leadTypes: leadTypes as LeadType[],
        description: description || null,
        status: initialStatus,
        assignedSalesRepId: assignedSalesRepId, // Auto-assign to creator
        // Referral fields
        referrerFirstName:
          sourceType === "REFERRAL" ? referrerFirstName || null : null,
        referrerLastName:
          sourceType === "REFERRAL" ? referrerLastName || null : null,
        referrerPhone: sourceType === "REFERRAL" ? referrerPhone || null : null,
        referrerEmail: sourceType === "REFERRAL" ? referrerEmail || null : null,
        referrerCustomerId: referrerCustomerId,
        referrerIsCustomer: referrerIsCustomer,
        // Customer classification
        isMilitaryFirstResponder: isMilitaryFirstResponder || false,
        isContractor: isContractor || false,
        contractorLicenseNumber:
          isContractor && contractorLicenseNumber?.trim()
            ? contractorLicenseNumber.trim()
            : null,
        // Marketing attribution
        hearAboutUs: hearAboutUs || null,
        hearAboutUsOther:
          hearAboutUs === "OTHER" && hearAboutUsOther?.trim()
            ? hearAboutUsOther.trim()
            : null,
        // Track who created the lead - using type assertion since Prisma types may be out of sync
        ...({ createdBy: session.user.id } as any),
      },
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

    logAction("Lead created", session.user.id, session.user.role, {
      leadId: lead.id,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      leadTypes: leadTypes,
      status: lead.status,
      assignedTo: assignedSalesRepId || "Unassigned",
      sourceType: sourceType,
      isReferral: sourceType === "REFERRAL",
    });

    return NextResponse.json({ lead, customer }, { status: 201 });
  } catch (error: any) {
    const session = await getServerSession(authOptions);
    logError("Error creating lead", error, {
      userId: session?.user?.id,
      userRole: session?.user?.role,
    });
    return NextResponse.json(
      { error: error.message || "Failed to create lead" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logInfo("GET /api/leads - Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const myLeads = searchParams.get("myLeads") === "true" || false;
    const unassigned = searchParams.get("unassigned") === "true" || false;

    logInfo("GET /api/leads - Fetching leads", {
      userId: session.user.id,
      userRole: session.user.role,
      status: status || "all",
      myLeads,
      unassigned,
    });

    const where: any = {};

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Filter by assigned sales rep if user is SALES_REP and myLeads is true
    // Unassigned filter takes precedence if both are set (though they shouldn't be)
    if (unassigned) {
      where.assignedSalesRepId = null;
    } else if (myLeads && session.user.role === "SALES_REP") {
      where.assignedSalesRepId = session.user.id;
    }

    // ADMIN can see all leads, SALES_REP can see all leads (with limited data)
    // No filtering needed for sales reps - they can see all leads in read-only mode

    const includeObj: any = {
      customer: true, // Always include full customer, we'll filter in response
      assignedSalesRep: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    };

    // Only include referrer info for admins, when viewing own leads, or when viewing unassigned leads (so sales reps can claim them)
    if (
      session.user.role === "ADMIN" ||
      (session.user.role === "SALES_REP" && (myLeads || unassigned))
    ) {
      includeObj.referrerCustomer = {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      };
    }

    const leads = await prisma.lead.findMany({
      where,
      include: includeObj,
      orderBy: {
        createdAt: "desc",
      },
    });

    // For sales reps viewing all leads (not their own and not unassigned), strip out sensitive data
    // Unassigned leads show full data so sales reps can claim them
    if (session.user.role === "SALES_REP" && !myLeads && !unassigned) {
      const limitedLeads = leads.map((lead) => {
        // Type assertion: customer is always included as a single object (not an array)
        // Prisma's include returns customer as a single relation object
        const leadWithCustomer = lead as typeof lead & {
          customer: {
            id: string;
            firstName: string;
            lastName: string;
          };
        };
        const customer = leadWithCustomer.customer;
        return {
          id: lead.id,
          customer: {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
          },
          assignedSalesRep: lead.assignedSalesRep,
          // Include status and created date for context
          status: lead.status,
          createdAt: lead.createdAt,
        };
      });
      logInfo("GET /api/leads - Returning limited leads for sales rep", {
        userId: session.user.id,
        leadCount: limitedLeads.length,
      });
      return NextResponse.json({ leads: limitedLeads }, { status: 200 });
    }

    logInfo("GET /api/leads - Returning leads", {
      userId: session.user.id,
      userRole: session.user.role,
      leadCount: leads.length,
    });

    return NextResponse.json({ leads }, { status: 200 });
  } catch (error: any) {
    const session = await getServerSession(authOptions);
    logError("Error fetching leads", error, {
      userId: session?.user?.id,
      userRole: session?.user?.role,
    });
    return NextResponse.json(
      { error: error.message || "Failed to fetch leads" },
      { status: 500 }
    );
  }
}
