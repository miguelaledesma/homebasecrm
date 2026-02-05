import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Split query into words for full name search
    const queryWords = query.split(/\s+/).filter(Boolean);
    
    // Build search conditions
    const searchConditions: any[] = [
      // First name contains query
      {
        firstName: {
          contains: query,
          mode: "insensitive",
        },
      },
      // Last name contains query
      {
        lastName: {
          contains: query,
          mode: "insensitive",
        },
      },
      // Phone contains query
      {
        phone: {
          contains: query,
          mode: "insensitive",
        },
      },
      // Email contains query
      {
        email: {
          contains: query,
          mode: "insensitive",
        },
      },
    ];

    // If query has multiple words, search for first name matching one word and last name matching another
    if (queryWords.length >= 2) {
      searchConditions.push({
        AND: [
          {
            OR: [
              {
                firstName: {
                  contains: queryWords[0],
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: queryWords[0],
                  mode: "insensitive",
                },
              },
            ],
          },
          {
            OR: [
              {
                firstName: {
                  contains: queryWords[1],
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: queryWords[1],
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
      });
    }

    // Search for customers by name, phone, or email (partial match)
    const customers = await prisma.customer.findMany({
      where: {
        OR: searchConditions,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        addressLine1: true,
        city: true,
        state: true,
        zip: true,
        createdAt: true,
        leads: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1, // Get the most recent lead
          select: {
            id: true,
            customerNumber: true,
            status: true,
            leadTypes: true,
            createdAt: true,
            // Exclude creditScore - column doesn't exist in database yet
          },
        },
      },
      take: 10, // Limit to 10 results
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format results
    const results = customers.map((customer) => ({
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email,
      addressLine1: customer.addressLine1,
      city: customer.city,
      state: customer.state,
      zip: customer.zip,
      mostRecentLead: customer.leads[0]
        ? {
            id: customer.leads[0].id,
            customerNumber: customer.leads[0].customerNumber,
            status: customer.leads[0].status,
            leadTypes: customer.leads[0].leadTypes,
            createdAt: customer.leads[0].createdAt,
          }
        : null,
    }));

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Error searching customers:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search customers" },
      { status: 500 }
    );
  }
}
