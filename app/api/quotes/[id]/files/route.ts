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

    // Check if quote exists and user has permission
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Check permissions: ADMIN can upload to any quote, SALES_REP only to their own
    if (
      session.user.role === "SALES_REP" &&
      quote.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    // Allowed file types (adjust as needed)
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain",
    ]
    const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "jpg", "jpeg", "png", "gif", "txt"]

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

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const fileKey = `quotes/${params.id}/${timestamp}-${sanitizedFileName}`

    // Upload file to Railway storage
    const filePath = await storage.uploadFile(file, fileKey)

    // Get file type from file
    const fileType = file.type || fileExtension || "unknown"

    // Create quote file record (store the path, not full URL)
    const quoteFile = await prisma.quoteFile.create({
      data: {
        quoteId: params.id,
        fileUrl: filePath, // Store the S3 key/path, not the full URL
        fileType,
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

    return NextResponse.json(
      {
        file: {
          ...quoteFile,
          fileUrl: downloadUrl, // Return presigned URL to client
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload file" },
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

    // Check if quote exists and user has permission
    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // SALES_REP can only see files for their quotes
    if (
      session.user.role === "SALES_REP" &&
      quote.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const files = await prisma.quoteFile.findMany({
      where: { quoteId: params.id },
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

    // Generate presigned URLs for each file (if using Railway S3)
    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        let downloadUrl = file.fileUrl
        try {
          // Check if it's a data URL (mock storage) or needs presigned URL
          if (!file.fileUrl.startsWith("data:")) {
            if (storage.getFileUrl) {
              downloadUrl = await storage.getFileUrl(file.fileUrl, 3600) // 1 hour expiry
            }
          }
        } catch (error) {
          console.warn(`Failed to generate presigned URL for file ${file.id}:`, error)
        }

        return {
          ...file,
          fileUrl: downloadUrl,
        }
      })
    )

    return NextResponse.json({ files: filesWithUrls }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching files:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch files" },
      { status: 500 }
    )
  }
}

