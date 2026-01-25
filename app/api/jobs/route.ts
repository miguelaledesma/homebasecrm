import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, LeadStatus, JobStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can access jobs
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const jobStatus = searchParams.get("jobStatus");

    const where: any = {
      status: LeadStatus.WON,
      // Removed jobStatus filter - now shows all WON leads including those without a job status
    };

    // Filter by job status if provided
    if (jobStatus && jobStatus !== "all") {
      if (jobStatus === "not_set") {
        // Filter for jobs without a status
        where.jobStatus = null;
      } else {
        // Filter for specific job status
        where.jobStatus = jobStatus as JobStatus;
      }
    }

    const jobs = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        leadTypes: true,
        description: true,
        status: true,
        jobStatus: true,
        jobScheduledDate: true,
        closedDate: true,
        jobCompletedDate: true,
        createdAt: true,
        customer: true,
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        quotes: {
          select: {
            id: true,
            quoteNumber: true,
            status: true,
          },
          orderBy: {
            createdAt: "desc", // Get most recent quote first
          },
        },
        crewAssignments: {
          include: {
            crew: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        closedDate: "desc", // Most recently closed first
      },
    });

    return NextResponse.json({ jobs }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
