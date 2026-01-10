import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { QuoteStatus, UserRole } from "@prisma/client"
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

    // Check permissions: SALES_REP can only see their quotes
    if (
      session.user.role === "SALES_REP" &&
      quote.salesRepId !== session.user.id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Generate presigned URLs for files (if using Railway S3)
    const quoteWithUrls = {
      ...quote,
      files: await Promise.all(
        quote.files.map(async (file) => {
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
    const { status, amount, expiresAt, sentAt } = body

    // Check if quote exists and user has permission
    const existingQuote = await prisma.quote.findUnique({
      where: { id: params.id },
    })

    if (!existingQuote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 })
    }

    // Only admins can edit quotes (amount, expiresAt, etc.)
    // Sales reps can only update status of their own quotes
    const isUpdatingAmountOrExpires = amount !== undefined || expiresAt !== undefined
    
    if (isUpdatingAmountOrExpires && session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Sales reps can only update status of their own quotes
    if (
      status !== undefined &&
      session.user.role === "SALES_REP" &&
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
      changes: { status, amount, expiresAt, sentAt },
    })

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
    })

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

