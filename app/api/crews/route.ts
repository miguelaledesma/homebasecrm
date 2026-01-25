import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { requireAdmin } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const crews = await prisma.crew.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the data to include member names from JSON and user members
    const crewsWithMembers = crews.map((crew) => {
      const memberNames = (crew.memberNames as string[]) || [];
      const userMembers = crew.members.map((m) => ({
        id: m.user.id,
        name: m.user.name || m.user.email,
        email: m.user.email,
      }));

      return {
        id: crew.id,
        name: crew.name,
        description: crew.description,
        memberNames,
        userMembers,
        allMembers: [
          ...userMembers.map((u) => ({ name: u.name, type: "user" as const })),
          ...memberNames.map((name) => ({ name, type: "external" as const })),
        ],
        jobAssignmentCount: crew._count.jobAssignments,
        createdAt: crew.createdAt.toISOString(),
        updatedAt: crew.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({ crews: crewsWithMembers }, { status: 200 });
  } catch (error: any) {
    console.error("Error fetching crews:", error);
    if (error.message === "Forbidden" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch crews" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const body = await request.json();
    const { name, description, memberNames, userIds } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Crew name is required" },
        { status: 400 }
      );
    }

    // Validate memberNames is an array of strings if provided
    if (memberNames && !Array.isArray(memberNames)) {
      return NextResponse.json(
        { error: "memberNames must be an array" },
        { status: 400 }
      );
    }

    // Validate userIds is an array of strings if provided
    if (userIds && !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: "userIds must be an array" },
        { status: 400 }
      );
    }

    // Create crew with members
    const crew = await prisma.crew.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        memberNames: memberNames && memberNames.length > 0 ? memberNames : null,
        members: userIds && userIds.length > 0
          ? {
              create: userIds.map((userId: string) => ({
                userId,
              })),
            }
          : undefined,
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

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating crew:", error);
    if (error.message === "Forbidden" || error.message === "Unauthorized") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to create crew" },
      { status: 500 }
    );
  }
}
