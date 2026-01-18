import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QuoteStatus, UserRole, LeadStatus } from "@prisma/client"
import { logAction, logError } from "@/lib/utils"
import { storage } from "@/lib/storage"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const quote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        lead: {
          include: {
            customer: true,
          },
        },
        appointment: true,
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
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
        },
      },
    })

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Check permissions: SALES_REP and CONCIERGE can only see their quotes
    if (
      (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE") &&
      quote.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    // Generate presigned URLs for files (if using Railway S3)
    const quoteWithUrls = {
      ...quote,
      files: await Promise.all(
        quote.files.map(async (file) => {
          const originalS3Key = file.fileUrl // Store original S3 key before generating presigned URL
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
            fileName: extractFileName(originalS3Key), // Include original filename
          }
        })
      ),
    }

    return NextResponse.json({ quote: quoteWithUrls }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching quote:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch quote" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { status, amount, expiresAt, sentAt, expenses } = body

    // Check if quote exists and user has permission
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Only admins can edit quotes (amount, expiresAt, expenses, etc.)
    // Sales reps can only update status of their own quotes
    const isUpdatingAmountOrExpires = amount !== undefined || expiresAt !== undefined || expenses !== undefined
    
    if (isUpdatingAmountOrExpires && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Validate expenses if provided
    if (expenses !== undefined) {
      if (expenses !== null) {
        if (typeof expenses !== "object" || Array.isArray(expenses)) {
          return NextResponse.json(
            { error: "Expenses must be an object with string keys and numeric values, or null" },
            { status: 400 }
          )
        }
        // Validate each value is a number
        for (const [key, value] of Object.entries(expenses)) {
          if (typeof key !== "string") {
            return NextResponse.json(
              { error: "Expense keys must be strings" },
              { status: 400 }
            )
          }
          if (typeof value !== "number" || isNaN(value) || value < 0) {
            return NextResponse.json(
              { error: `Expense value for "${key}" must be a non-negative number` },
              { status: 400 }
            )
          }
        }
      }
    }

    // Sales reps and concierges can only update status of their own quotes
    if (
      status !== undefined &&
      (session.user.role === "SALES_REP" || session.user.role === "CONCIERGE") &&
      existingQuote.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const updateData: any = {}
    if (status) {
      updateData.status = status as QuoteStatus
    }
    if (amount !== undefined) {
      updateData.amount = parseFloat(amount)
    }
    if (expiresAt !== undefined) {
      updateData.expiresAt = expiresAt ? new Date(expiresAt) : null
    }
    if (sentAt !== undefined) {
      updateData.sentAt = sentAt ? new Date(sentAt) : null
    }
    if (expenses !== undefined) {
      updateData.expenses = expenses // Prisma will handle JSON serialization
    }

    // Check if status is being changed to ACCEPTED
    const isChangingToAccepted = status === QuoteStatus.ACCEPTED && existingQuote.status !== QuoteStatus.ACCEPTED

    // If changing to ACCEPTED, we need to update the lead status to WON
    if (isChangingToAccepted) {
      // Get the lead to check current status
      const lead = await prisma.lead.findUnique({
        where: { id: existingQuote.leadId },
        select: { id: true, status: true },
      })

      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 })
      }

      // Update quote and lead in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update quote
        const updatedQuote = await tx.quote.update({
          where: { id: params.id },
          data: updateData,
          include: {
            lead: {
              include: {
                customer: true,
              },
            },
            appointment: true,
            salesRep: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            files: {
              include: {
                uploadedBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        })

        // Update lead to WON if not already WON
        if (lead.status !== LeadStatus.WON) {
          const now = new Date()
          await tx.lead.update({
            where: { id: existingQuote.leadId },
            data: {
              status: LeadStatus.WON,
              closedDate: now,
            },
          })

          // Create a note indicating the lead was marked as won via quote acceptance
          await tx.leadNote.create({
            data: {
              leadId: existingQuote.leadId,
              content: "Lead marked as won (quote accepted).",
              createdBy: session.user.id,
            },
          })
        }

        return updatedQuote
      })

      logAction("Quote accepted - lead marked as won", session.user.id, session.user.role, {
        quoteId: params.id,
        leadId: result.leadId,
        changes: { status, amount, expiresAt, sentAt, expenses },
      }, session.user.name || session.user.email)

      return NextResponse.json({ quote: result }, { status: 200 })
    }

    // Normal update (not changing to ACCEPTED)
    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: updateData,
      include: {
        lead: {
          include: {
            customer: true,
          },
        },
        appointment: true,
        salesRep: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        files: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })

    logAction("Quote updated", session.user.id, session.user.role, {
      quoteId: params.id,
      leadId: quote.leadId,
      changes: { status, amount, expiresAt, sentAt, expenses },
    }, session.user.name || session.user.email)

    return NextResponse.json({ quote }, { status: 200 })
  } catch (error: any) {
    const session = await getServerSession(authOptions)
    logError("Error updating quote", error, {
      quoteId: params.id,
      userId: session?.user?.id,
      userRole: session?.user?.role,
    })
    return NextResponse.json(
      { error: error.message || "Failed to update quote" },
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

    // Only admins can delete quotes
    if (session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if quote exists
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
      include: {
        lead: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Delete the quote (files will be cascade deleted if foreign key is set up)
    await prisma.quote.delete({
      where: { id: params.id },
    })

    logAction("Quote deleted", session.user.id, session.user.role, {
      quoteId: params.id,
      leadId: existingQuote.leadId,
      amount: existingQuote.amount,
      status: existingQuote.status,
    }, session.user.name || session.user.email)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    const session = await getServerSession(authOptions)
    logError("Error deleting quote", error, {
      quoteId: params.id,
      userId: session?.user?.id,
      userRole: session?.user?.role,
    })
    return NextResponse.json(
      { error: error.message || "Failed to delete quote" },
      { status: 500 }
    )
  }
}

