import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { storage } from "@/lib/storage"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
  "video/mp4",
  "video/quicktime",
]

const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx",
  "jpg", "jpeg", "png", "gif", "webp",
  "txt", "csv", "mp4", "mov",
]

// POST /api/messages/[conversationId]/attachments - Upload file(s) and create a message
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { conversationId } = params

    // Verify user is a participant
    const participant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: session.user.id,
        },
      },
    })

    if (!participant) {
      return NextResponse.json(
        { error: "Conversation not found or access denied" },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const content = (formData.get("content") as string) || ""

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one file is required" },
        { status: 400 }
      )
    }

    if (files.length > 5) {
      return NextResponse.json(
        { error: "Maximum 5 files per message" },
        { status: 400 }
      )
    }

    // Validate content length (max 5000 chars)
    const trimmedContent = content.trim()
    if (trimmedContent.length > 5000) {
      return NextResponse.json(
        { error: "Message content cannot exceed 5000 characters" },
        { status: 400 }
      )
    }

    // Validate all files first
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File "${file.name}" exceeds 10MB limit` },
          { status: 400 }
        )
      }

      if (file.size === 0) {
        return NextResponse.json(
          { error: `File "${file.name}" is empty` },
          { status: 400 }
        )
      }

      // Validate file name (prevent path traversal and other attacks)
      if (!file.name || file.name.length === 0 || file.name.length > 255) {
        return NextResponse.json(
          { error: `Invalid file name for "${file.name}"` },
          { status: 400 }
        )
      }

      // Check for path traversal attempts
      if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
        return NextResponse.json(
          { error: `Invalid file name: "${file.name}"` },
          { status: 400 }
        )
      }

      const fileExtension = file.name.split(".").pop()?.toLowerCase()
      const isValidType =
        ALLOWED_TYPES.includes(file.type) ||
        (fileExtension && ALLOWED_EXTENSIONS.includes(fileExtension))

      if (!isValidType) {
        return NextResponse.json(
          { error: `File type not allowed for "${file.name}". Allowed: PDF, Word, Excel, Images, Text, CSV, Video` },
          { status: 400 }
        )
      }
    }

    // Upload all files to storage first (before transaction)
    // Track uploaded files for cleanup if transaction fails
    const uploadedFiles: Array<{ file: File; filePath: string; fileKey: string }> = []
    const uploadedFileKeys: string[] = []

    try {
      // Upload all files first
      for (const file of files) {
        const timestamp = Date.now()
        // Sanitize filename more thoroughly
        const sanitizedFileName = file.name
          .replace(/[^a-zA-Z0-9.-]/g, "_")
          .replace(/^\.+|\.+$/g, "") // Remove leading/trailing dots
          .substring(0, 200) // Limit length
        
        if (!sanitizedFileName) {
          throw new Error(`Invalid file name after sanitization: "${file.name}"`)
        }

        // Use a temporary key - we'll update it after message creation
        const tempKey = `messages/${conversationId}/temp/${timestamp}-${Math.random().toString(36).substring(7)}-${sanitizedFileName}`
        const filePath = await storage.uploadFile(file, tempKey)
        
        uploadedFiles.push({ file, filePath, fileKey: tempKey })
        uploadedFileKeys.push(tempKey)
      }

      // Now create message and attachments in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create the message
        const message = await tx.message.create({
          data: {
            conversationId,
            senderId: session.user.id,
            content: trimmedContent || (files.length === 1 ? `📎 ${files[0].name}` : `📎 ${files.length} files`),
          },
        })

        // Create attachment records
        // Note: Files are stored at temp paths, but that's fine - the filePath in DB
        // points to where the file actually is (temp path for now, or data URL for mock)
        const attachments = []
        
        for (const { file, filePath } of uploadedFiles) {
          const attachment = await tx.messageAttachment.create({
            data: {
              messageId: message.id,
              fileName: file.name,
              fileType: file.type || "application/octet-stream",
              fileSize: file.size,
              filePath: filePath, // Use the actual uploaded path (temp path or data URL)
            },
          })
          
          attachments.push(attachment)
        }

        // Update conversation's updatedAt
        await tx.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        })

        // Fetch the full message with sender
        const fullMessage = await tx.message.findUnique({
          where: { id: message.id },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            attachments: true,
          },
        })

        return { message: fullMessage, attachments }
      })

      // Generate download URLs for the response
      const messageWithUrls = {
        ...result.message,
        attachments: await Promise.all(
          (result.message?.attachments || []).map(async (att) => {
            let downloadUrl = att.filePath
            try {
              if (storage.getFileUrl) {
                downloadUrl = await storage.getFileUrl(att.filePath, 3600)
              }
            } catch {
              // fallback to path for mock storage
            }
            return { ...att, downloadUrl }
          })
        ),
      }

      return NextResponse.json({ message: messageWithUrls }, { status: 201 })
    } catch (error: any) {
      // Cleanup: Delete any uploaded files if transaction failed
      console.error("Error in attachment upload, cleaning up files:", error)
      
      for (const fileKey of uploadedFileKeys) {
        try {
          // Only try to delete if it's not a data URL (mock storage)
          if (!fileKey.includes("data:")) {
            await storage.deleteFile(fileKey)
          }
        } catch (deleteError) {
          console.error(`Failed to cleanup file ${fileKey}:`, deleteError)
        }
      }

      throw error // Re-throw to be caught by outer try-catch
    }
  } catch (error: any) {
    console.error("Error uploading attachment:", error)
    return NextResponse.json(
      { error: error.message || "Failed to upload attachment" },
      { status: 500 }
    )
  }
}
