import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can update user roles
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can update user roles" },
        { status: 403 }
      )
    }

    const userId = params.id
    const body = await request.json()
    const { role } = body

    // Validate role
    if (!role || !["ADMIN", "SALES_REP", "CONCIERGE"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be ADMIN, SALES_REP, or CONCIERGE" },
        { status: 400 }
      )
    }

    // Prevent changing your own role
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: role as UserRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ user: updatedUser }, { status: 200 })
  } catch (error: any) {
    console.error("Error updating user role:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user role" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins can delete users
    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can delete users" },
        { status: 403 }
      )
    }

    const userId = params.id

    // Prevent deleting yourself
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Unassign all leads assigned to this user before deleting
    // This prevents foreign key constraint issues
    await prisma.lead.updateMany({
      where: { assignedSalesRepId: userId },
      data: { assignedSalesRepId: null },
    })

    // Delete the user (cascading deletes will handle related records)
    // Note: Prisma will handle cascading deletes based on schema relations
    // - appointments, quotes, uploadedQuoteFiles, leadNotes will be deleted via onDelete: Cascade
    await prisma.user.delete({
      where: { id: userId },
    })

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    )
  }
}

