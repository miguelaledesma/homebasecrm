import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; fileId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if quote exists
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Check if file exists
    const file = await prisma.quoteFile.findUnique({
      where: { id: params.fileId },
      include: {
        uploadedBy: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Check permissions: ADMIN can delete any file, users can delete their own files
    const canDelete =
      session.user.role === "ADMIN" || file.uploadedBy.id === session.user.id

    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete file from storage
    try {
      await storage.deleteFile(file.fileUrl)
    } catch (error) {
      console.error("Error deleting file from storage:", error)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete file record from database
    await prisma.quoteFile.delete({
      where: { id: params.fileId },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete file" },
      { status: 500 }
    )
  }
}

