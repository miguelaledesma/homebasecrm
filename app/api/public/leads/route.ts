import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  SourceType,
  LeadType,
  LeadStatus,
} from "@prisma/client";
import { logInfo, logError } from "@/lib/utils";

// Simple in-memory rate limiting store
// In production, consider using Redis (Upstash) for distributed rate limiting
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limiting configuration
const RATE_LIMIT_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || "5",
  10
);
const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || "900000",
  10
); // 15 minutes default

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of Array.from(rateLimitStore.entries())) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client IP address from request
 */
function getClientIp(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip"); // Cloudflare

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // Fallback to a default if no IP found (shouldn't happen in production)
  return "unknown";
}

/**
 * Check if request exceeds rate limit
 */
function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt < now) {
    // Create new entry or reset expired one
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  entry.count += 1;
  return { allowed: true };
}

/**
 * Verify reCAPTCHA token with Google
 */
async function verifyCaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.CAPTCHA_SECRET_KEY;
  const captchaEnabled = process.env.CAPTCHA_ENABLED === "true";

  // If CAPTCHA is not explicitly enabled, skip verification
  if (!captchaEnabled || !secretKey) {
    logInfo("CAPTCHA verification skipped (not enabled or no secret key)");
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data = await response.json();
    const scoreThreshold = parseFloat(
      process.env.CAPTCHA_SCORE_THRESHOLD || "0.5"
    );

    // For reCAPTCHA v3, check score (0.0 = bot, 1.0 = human)
    // For reCAPTCHA v2, check success boolean
    if (data.score !== undefined) {
      // v3
      return data.success === true && data.score >= scoreThreshold;
    } else {
      // v2
      return data.success === true;
    }
  } catch (error) {
    logError("Error verifying CAPTCHA", error);
    // Fail open in case of network issues (you may want to fail closed)
    return true;
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["*"]; // Allow all if not configured (for development)

  const isAllowed =
    allowedOrigins.includes("*") ||
    (origin && allowedOrigins.includes(origin));

  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": isAllowed && origin ? origin : "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400", // 24 hours
    },
  });
}

/**
 * Public API endpoint for lead submissions from landing page
 * POST /api/public/leads
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIp = getClientIp(request);

  try {
    // Check rate limiting
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      logInfo("Rate limit exceeded", {
        ip: clientIp,
        retryAfter: rateLimitCheck.retryAfter,
      });
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: rateLimitCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitCheck.retryAfter),
            "Access-Control-Allow-Origin": "*", // CORS for error response
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      firstName,
      lastName,
      phone,
      email,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      leadTypes,
      description,
      hearAboutUs,
      hearAboutUsOther,
      isMilitaryFirstResponder,
      creditScore,
      captchaToken,
    } = body;

    // Validate required fields
    if (!firstName || !lastName || !leadTypes || leadTypes.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: firstName, lastName, and at least one leadType" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Validate: if OTHER is selected, description is required
    if (leadTypes.includes("OTHER") && !description?.trim()) {
      return NextResponse.json(
        { error: "Description is required when 'Other' is selected" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Verify CAPTCHA (only if explicitly enabled)
    const captchaEnabled = process.env.CAPTCHA_ENABLED === "true";
    if (captchaEnabled) {
      if (!captchaToken) {
        // CAPTCHA is enabled but token not provided
        logInfo("CAPTCHA token missing", { ip: clientIp });
        return NextResponse.json(
          { error: "CAPTCHA token is required" },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
      
      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        logInfo("CAPTCHA verification failed", { ip: clientIp });
        return NextResponse.json(
          { error: "CAPTCHA verification failed" },
          {
            status: 400,
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }
    }
    // If CAPTCHA is not enabled, skip verification (optional)

    // Check if customer already exists (by phone or email)
    let customer = null;
    if (phone || email) {
      customer = await prisma.customer.findFirst({
        where: {
          OR: [...(phone ? [{ phone }] : []), ...(email ? [{ email }] : [])],
        },
      });
    }

    // Create or update customer
    if (customer) {
      // Update existing customer with new info if provided
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          firstName: firstName || customer.firstName,
          lastName: lastName || customer.lastName,
          phone: phone || customer.phone,
          email: email || customer.email,
          addressLine1: addressLine1 || customer.addressLine1,
          addressLine2: addressLine2 || customer.addressLine2,
          city: city || customer.city,
          state: state || customer.state,
          zip: zip || customer.zip,
          // Keep existing sourceType for returning customers
          sourceType: customer.sourceType,
        },
      });
    } else {
      // Create new customer
      // Public submissions default to CALL_IN source type
      customer = await prisma.customer.create({
        data: {
          firstName,
          lastName,
          phone: phone || null,
          email: email || null,
          addressLine1: addressLine1 || null,
          addressLine2: addressLine2 || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          sourceType: SourceType.CALL_IN,
        },
      });
    }

    // Generate customer number
    const leadCount = await prisma.lead.count();
    const customerNumber = `105-${String(leadCount + 1).padStart(6, "0")}`;

    // Create lead (unassigned, status = NEW)
    const lead = await prisma.lead.create({
      data: {
        customerNumber,
        customerId: customer.id,
        leadTypes: leadTypes as LeadType[],
        description: description || null,
        status: LeadStatus.NEW,
        assignedSalesRepId: null, // Unassigned - admins will assign
        // Customer classification
        isMilitaryFirstResponder: isMilitaryFirstResponder || false,
        // Marketing attribution
        hearAboutUs: hearAboutUs || null,
        hearAboutUsOther:
          hearAboutUs === "OTHER" && hearAboutUsOther?.trim()
            ? hearAboutUsOther.trim()
            : null,
        // Credit score - column doesn't exist in database yet, so we skip it for now
        // creditScore: creditScore || null,
        // No createdBy since this is a public submission
        createdBy: null,
      },
      select: {
        id: true,
        customerNumber: true,
        customerId: true,
        leadTypes: true,
        description: true,
        status: true,
        closedDate: true,
        jobStatus: true,
        jobScheduledDate: true,
        jobCompletedDate: true,
        assignedSalesRepId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        // Exclude creditScore - column doesn't exist in database yet
        customer: true,
      },
    });

    logInfo("Public lead created", {
      leadId: lead.id,
      customerId: customer.id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      leadTypes: leadTypes,
      ip: clientIp,
      duration: Date.now() - startTime,
    });

    // Get CORS origin
    const origin = request.headers.get("origin");
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : ["*"];
    const isAllowed =
      allowedOrigins.includes("*") ||
      (origin && allowedOrigins.includes(origin));

    return NextResponse.json(
      {
        success: true,
        lead: {
          id: lead.id,
          customerNumber: lead.customerNumber,
          status: lead.status,
        },
        message: "Lead submitted successfully",
      },
      {
        status: 201,
        headers: {
          "Access-Control-Allow-Origin":
            isAllowed && origin ? origin : "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      }
    );
  } catch (error: any) {
    logError("Error creating public lead", error, {
      ip: clientIp,
      duration: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: "An error occurred while submitting your request. Please try again later.",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
