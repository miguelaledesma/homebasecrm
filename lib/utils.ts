import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format lead type enum value to human-readable label
export function formatLeadType(type: string): string {
  const typeMap: Record<string, string> = {
    FLOOR: "Flooring",
    CARPET: "Carpet",
    TILE_STONE: "Tile/Stone",
    MATERIALS: "Materials",
    KITCHEN: "Kitchen",
    BATH: "Bathroom",
    ADUS: "ADU's",
    PAINTING: "Painting",
    ROOFING: "Roofing",
    STUCCO: "Stucco",
    CONCRETE: "Concrete",
    TURF: "Turf",
    LANDSCAPING: "Landscaping",
    MONTHLY_YARD_MAINTENANCE: "Monthly Yard Maintenance",
    OTHER: "Other",
  }
  return typeMap[type] || type
}

// Format array of lead types for display
export function formatLeadTypes(types: string[]): string {
  return types.map(formatLeadType).join(", ")
}

// Format phone number to (XXX) XXX-XXXX format
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // If we don't have exactly 10 digits, return the original (might be international)
  if (digits.length !== 10) {
    return phone;
  }
  
  // Format as (XXX) XXX-XXXX
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

// Logging helper for structured logs in Railway
export function logInfo(message: string, data?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  console.log(`[INFO] ${timestamp} - ${message}`, data ? JSON.stringify(data, null, 2) : "");
}

export function logError(message: string, error: any, context?: Record<string, any>) {
  const timestamp = new Date().toISOString();
  console.error(`[ERROR] ${timestamp} - ${message}`, {
    error: error?.message || String(error),
    stack: error?.stack,
    ...context,
  });
}

export function logAction(
  action: string, 
  userId: string, 
  userRole: string, 
  details?: Record<string, any>,
  username?: string | null
) {
  const timestamp = new Date().toISOString();
  const userDisplay = username || userId;
  console.log(`[ACTION] ${timestamp} - ${action}`, {
    user: userDisplay,
    userId,
    userRole,
    ...details,
  });
}

// Format date to PST/PDT timezone with readable format
export function formatPSTDate(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

