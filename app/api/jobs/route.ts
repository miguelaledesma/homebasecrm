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
      jobStatus: { not: null }, // Only show leads with a job status
    };

    // Filter by job status if provided
    if (jobStatus && jobStatus !== "all") {
      where.jobStatus = jobStatus as JobStatus;
    }

    const jobs = await prisma.lead.findMany({
      where,
      include: {
        customer: true,
        assignedSalesRep: {
          select: {
            id: true,
            name: true,
            email: true,
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
