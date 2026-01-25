import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const crew = await prisma.crew.findUnique({
      where: { id: params.id },
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
        jobAssignments: {
          include: {
            lead: {
              select: {
                id: true,
                customer: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
                jobStatus: true,
              },
            },
          },
        },
        _count: {
          select: {
            jobAssignments: true,
          },
        },
      },
    });

    if (!crew) {
      return NextResponse.json({ error: "Crew not found" }, { status: 404 });
    }

    const memberNamesArray = (crew.memberNames as string[]) || [];
    const userMembers = crew.members.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email,
      email: m.user.email,
    }));

    return NextResponse.json({
      crew: {
        id: crew.id,
        name: crew.name,
        description: crew.description,
        memberNames: memberNamesArray,
        userMembers,
        allMembers: [
          ...userMembers.map((u) => ({ name: u.name, type: "user" as const })),
          ...memberNamesArray.map((name) => ({ name, type: "external" as const })),
        ],
        jobAssignments: crew.jobAssignments.map((assignment) => ({
          id: assignment.id,
          leadId: assignment.leadId,
          customerName: `${assignment.lead.customer.firstName} ${assignment.lead.customer.lastName}`,
          jobStatus: assignment.lead.jobStatus,
          assignedAt: assignment.assignedAt.toISOString(),
        })),
        jobAssignmentCount: crew._count.jobAssignments,
        createdAt: crew.createdAt.toISOString(),
        updatedAt: crew.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching crew:", error);
    if (error.message === "Forbidden" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch crew" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, description, memberNames, userIds } = body;

    // Check if crew exists
    const existingCrew = await prisma.crew.findUnique({
      where: { id: params.id },
    });

    if (!existingCrew) {
      return NextResponse.json({ error: "Crew not found" }, { status: 404 });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Crew name cannot be empty" },
          { status: 400 }
        );
      }
    }

    // Validate memberNames if provided
    if (memberNames !== undefined && !Array.isArray(memberNames)) {
      return NextResponse.json(
        { error: "memberNames must be an array" },
        { status: 400 }
      );
    }

    // Validate userIds if provided
    if (userIds !== undefined && !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: "userIds must be an array" },
        { status: 400 }
      );
    }

    // Update crew
    // First, update user members if userIds is provided
    if (userIds !== undefined) {
      // Delete all existing members
      await prisma.crewMember.deleteMany({
        where: { crewId: params.id },
      });

      // Create new members if provided
      if (userIds.length > 0) {
        await prisma.crewMember.createMany({
          data: userIds.map((userId: string) => ({
            crewId: params.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Update crew fields
    const crew = await prisma.crew.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && {
          description: description?.trim() || null,
        }),
        ...(memberNames !== undefined && {
          memberNames: memberNames && memberNames.length > 0 ? memberNames : null,
        }),
      },
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
        _count: {
          select: {
            jobAssignments: true,
          },
        },
      },
    });

    const memberNamesArray = (crew.memberNames as string[]) || [];
    const userMembers = crew.members.map((m) => ({
      id: m.user.id,
      name: m.user.name || m.user.email,
      email: m.user.email,
    }));

    return NextResponse.json({
      crew: {
        id: crew.id,
        name: crew.name,
        description: crew.description,
        memberNames: memberNamesArray,
        userMembers,
        allMembers: [
          ...userMembers.map((u) => ({ name: u.name, type: "user" as const })),
          ...memberNamesArray.map((name) => ({ name, type: "external" as const })),
        ],
        jobAssignmentCount: crew._count.jobAssignments,
        createdAt: crew.createdAt.toISOString(),
        updatedAt: crew.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error updating crew:", error);
    if (error.message === "Forbidden" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update crew" },
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

    // Check if crew exists
    const crew = await prisma.crew.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            jobAssignments: true,
          },
        },
      },
    });

    if (!crew) {
      return NextResponse.json({ error: "Crew not found" }, { status: 404 });
    }

    // Check if crew has active job assignments
    if (crew._count.jobAssignments > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete crew with active job assignments. Please unassign all jobs first.",
        },
        { status: 400 }
      );
    }

    // Delete crew (members will be cascade deleted)
    await prisma.crew.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting crew:", error);
    if (error.message === "Forbidden" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to delete crew" },
      { status: 500 }
    );
  }
}
