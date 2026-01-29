import { type ClassValue, clsx } from "clsx"
import { fromZonedTime, toZonedTime, format } from "date-fns-tz"
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
    LABOR: "Labor",
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

// Convert a datetime-local string (treated as PST/PDT) to UTC ISO string
// This handles the case where datetime-local inputs don't include timezone info
// and we need to treat them as PST/PDT timezone
export function convertPSTToUTC(datetimeLocal: string): string {
  if (!datetimeLocal) return datetimeLocal;
  
  // Parse the datetime-local string (format: "YYYY-MM-DDTHH:mm")
  const [datePart, timePart] = datetimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart || '').split(':').map(Number);
  
  // Create a date object in PST/PDT timezone
  const pstDate = new Date(year, month - 1, day, hours, minutes);
  
  // Convert from PST/PDT timezone to UTC using date-fns-tz
  const utcDate = fromZonedTime(pstDate, "America/Los_Angeles");
  
  return utcDate.toISOString();
}

// Convert a UTC ISO string to PST/PDT datetime-local string format
// This is used to display UTC dates in datetime-local inputs as PST time
export function convertUTCToPSTLocal(utcISOString: string): string {
  if (!utcISOString) return utcISOString;
  
  // Parse the UTC date
  const utcDate = new Date(utcISOString);
  
  // Convert UTC to PST/PDT timezone
  const pstDate = toZonedTime(utcDate, "America/Los_Angeles");
  
  // Format as datetime-local string (YYYY-MM-DDTHH:mm)
  return format(pstDate, "yyyy-MM-dd'T'HH:mm");
}
