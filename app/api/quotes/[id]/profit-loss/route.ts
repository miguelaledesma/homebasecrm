import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can upload P&L files
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if quote exists
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        lead: {
          select: {
            id: true,
            jobStatus: true,
            // Exclude creditScore - column doesn't exist in database yet
          },
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Only allow P&L uploads for ACCEPTED quotes with DONE job status
    if (quote.status !== "ACCEPTED" || quote.lead.jobStatus !== "DONE") {
      return NextResponse.json(
        { error: "P&L files can only be uploaded for accepted quotes with completed jobs" },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // File validation
    const maxSize = 10 * 1024 * 1024 // 10 MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10 MB limit" },
        { status: 400 }
      )
    }

    // Allowed file types for P&L documents
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "text/plain",
    ]
    const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "txt"]

    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    const isValidType =
      allowedTypes.includes(file.type) ||
      (fileExtension && allowedExtensions.includes(fileExtension))

    if (!isValidType) {
      return NextResponse.json(
        {
          error: `File type not allowed. Allowed types: PDF, Word, Excel, Images, or Text files`,
        },
        { status: 400 }
      )
    }

    // Delete existing P&L file if one exists (only one P&L file per quote)
    const existingPLFile = await prisma.quoteFile.findFirst({
      where: {
        quoteId: params.id,
        isProfitLoss: true,
      },
    })

    if (existingPLFile) {
      // Delete from storage
      try {
        await storage.deleteFile(existingPLFile.fileUrl)
      } catch (error) {
        console.warn("Failed to delete existing P&L file from storage:", error)
      }
      // Delete from database
      await prisma.quoteFile.delete({
        where: { id: existingPLFile.id },
      })
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileKey = `financials/${params.id}/${timestamp}-${sanitizedFileName}`

    // Upload file to Railway storage
    const filePath = await storage.uploadFile(file, fileKey)

    // Get file type from file
    const fileType = file.type || fileExtension || "unknown"

    // Create quote file record with isProfitLoss flag
    const quoteFile = await prisma.quoteFile.create({
      data: {
        quoteId: params.id,
        fileUrl: filePath, // Store the S3 key/path, not the full URL
        fileType,
        isProfitLoss: true,
        uploadedByUserId: session.user.id,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Generate presigned URL for the file (if using Railway S3)
    let downloadUrl = filePath
    try {
      if (storage.getFileUrl) {
        downloadUrl = await storage.getFileUrl(filePath, 3600) // 1 hour expiry
      }
    } catch (error) {
      // If presigned URL generation fails, use the path (for mock storage)
      console.warn("Failed to generate presigned URL:", error)
    }

    // Extract original filename from S3 key
    const extractFileName = (s3Key: string): string => {
      if (s3Key.startsWith("data:")) {
        return "Uploaded file"
      }
      const parts = s3Key.split("/")
      const filename = parts[parts.length - 1]
      // Remove timestamp prefix if present (format: timestamp-filename)
      const match = filename.match(/^\d+-(.+)$/)
      return match ? match[1] : filename
    }

    return NextResponse.json(
      {
        file: {
          ...quoteFile,
          fileUrl: downloadUrl, // Return presigned URL to client
          fileName: extractFileName(filePath), // Include original filename
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error uploading P&L file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload P&L file" },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only ADMIN can view P&L files
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if quote exists
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Get P&L file for this quote
    const plFile = await prisma.quoteFile.findFirst({
      where: {
        quoteId: params.id,
        isProfitLoss: true,
      },
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    })

    if (!plFile) {
      return NextResponse.json({ file: null }, { status: 200 })
    }

    // Helper function to extract filename from S3 key
    const extractFileName = (s3Key: string): string => {
      if (s3Key.startsWith("data:")) {
        return "Uploaded file"
      }
      const parts = s3Key.split("/")
      const filename = parts[parts.length - 1]
      // Remove timestamp prefix if present (format: timestamp-filename)
      const match = filename.match(/^\d+-(.+)$/)
      return match ? match[1] : filename
    }

    // Generate presigned URL for the file (if using Railway S3)
    let downloadUrl = plFile.fileUrl
    try {
      // Check if it's a data URL (mock storage) or needs presigned URL
      if (!plFile.fileUrl.startsWith("data:")) {
        if (storage.getFileUrl) {
          downloadUrl = await storage.getFileUrl(plFile.fileUrl, 3600) // 1 hour expiry
        }
      }
    } catch (error) {
      console.warn(`Failed to generate presigned URL for P&L file:`, error)
    }

    return NextResponse.json(
      {
        file: {
          ...plFile,
          fileUrl: downloadUrl,
          fileName: extractFileName(plFile.fileUrl),
        },
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching P&L file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch P&L file" },
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

    // Only ADMIN can delete P&L files
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if quote exists
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Find P&L file
    const plFile = await prisma.quoteFile.findFirst({
      where: {
        quoteId: params.id,
        isProfitLoss: true,
      },
    })

    if (!plFile) {
      return NextResponse.json({ error: "P&L file not found" }, { status: 404 })
    }

    // Delete from storage
    try {
      await storage.deleteFile(plFile.fileUrl)
    } catch (error) {
      console.warn("Failed to delete P&L file from storage:", error)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database
    await prisma.quoteFile.delete({
      where: { id: plFile.id },
    })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Error deleting P&L file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete P&L file" },
      { status: 500 }
    )
  }
}
