import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";
import { JobStatus } from "@prisma/client";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const assignments = await prisma.jobCrewAssignment.findMany({
      where: { leadId: params.id },
      include: {
        crew: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    const crews = assignments.map((assignment) => {
      const memberNamesArray = (assignment.crew.memberNames as string[]) || [];
      const userMembers = assignment.crew.members.map((m) => ({
        id: m.user.id,
        name: m.user.name || m.user.email,
        email: m.user.email,
      }));

      return {
        assignmentId: assignment.id,
        crew: {
          id: assignment.crew.id,
          name: assignment.crew.name,
          description: assignment.crew.description,
          memberNames: memberNamesArray,
          userMembers,
          allMembers: [
            ...userMembers.map((u) => ({ name: u.name, type: "user" as const })),
            ...memberNamesArray.map((name) => ({ name, type: "external" as const })),
          ],
        },
        assignedAt: assignment.assignedAt.toISOString(),
        assignedBy: assignment.assignedBy,
      };
    });

    return NextResponse.json({ crews }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching job crews:", error);
    if (error.message === "Forbidden" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch job crews" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAdmin();

    const body = await request.json();
    const { crewId } = body;

    if (!crewId || typeof crewId !== "string") {
      return NextResponse.json(
        { error: "crewId is required" },
        { status: 400 }
      );
    }

    // Verify the lead/job exists
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      select: { id: true, jobStatus: true, status: true },
    });

    if (!lead) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Verify the crew exists
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
      select: { id: true },
    });

    if (!crew) {
      return NextResponse.json({ error: "Crew not found" }, { status: 404 });
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.jobCrewAssignment.findUnique({
      where: {
        leadId_crewId: {
          leadId: params.id,
          crewId: crewId,
        },
      },
    });

    if (existingAssignment) {
      return NextResponse.json(
        { error: "Crew is already assigned to this job" },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await prisma.jobCrewAssignment.create({
      data: {
        leadId: params.id,
        crewId: crewId,
        assignedBy: user.id,
      },
      include: {
        crew: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const memberNamesArray = (assignment.crew.memberNames as string[]) || [];
    const userMembers = assignment.crew.members.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email,
      email: m.user.email,
    }));

    return NextResponse.json(
      {
        assignment: {
          id: assignment.id,
          crew: {
            id: assignment.crew.id,
            name: assignment.crew.name,
            description: assignment.crew.description,
            memberNames: memberNamesArray,
            userMembers,
            allMembers: [
              ...userMembers.map((u) => ({ name: u.name, type: "user" as const })),
              ...memberNamesArray.map((name) => ({ name, type: "external" as const })),
            ],
          },
          assignedAt: assignment.assignedAt.toISOString(),
          assignedBy: assignment.assignedBy,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error assigning crew to job:", error);
    if (error.message === "Forbidden" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Crew is already assigned to this job" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to assign crew to job" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const crewId = searchParams.get("crewId");

    if (!crewId) {
      return NextResponse.json(
        { error: "crewId query parameter is required" },
        { status: 400 }
      );
    }

    // Find and delete the assignment
    const assignment = await prisma.jobCrewAssignment.findUnique({
      where: {
        leadId_crewId: {
          leadId: params.id,
          crewId: crewId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: "Crew assignment not found" },
        { status: 404 }
      );
    }

    await prisma.jobCrewAssignment.delete({
      where: {
        leadId_crewId: {
          leadId: params.id,
          crewId: crewId,
        },
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error unassigning crew from job:", error);
    if (error.message === "Forbidden" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to unassign crew from job" },
      { status: 500 }
    );
  }
}
