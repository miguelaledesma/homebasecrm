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
  // Treat it as PST/PDT timezone
  const [datePart, timePart] = datetimeLocal.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = timePart.split(':').map(Number);
  
  // Create a date string in PST/PDT timezone format
  // We'll use a format that JavaScript can parse as PST/PDT
  const pstDateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  
  // Create a date object treating the string as PST/PDT
  // We do this by creating a date in UTC and then adjusting for PST offset
  // But actually, we need to use the timezone-aware approach
  
  // Better approach: Use Intl.DateTimeFormat to convert PST to UTC
  // Create a date object assuming the input is in PST/PDT
  const tempDate = new Date(`${pstDateString}-08:00`); // Start with PST offset
  
  // Check if DST applies (rough check - April to October)
  const monthNum = month - 1; // JavaScript months are 0-indexed
  const isDST = monthNum >= 3 && monthNum <= 9; // April (3) to October (9)
  
  // Adjust for DST if needed (PDT is UTC-7, PST is UTC-8)
  const offsetHours = isDST ? -7 : -8;
  
  // Create UTC date by manually calculating
  const utcDate = new Date(Date.UTC(year, monthNum, day, hours - offsetHours, minutes, 0));
  
  return utcDate.toISOString();
}
// Convert UTC ISO string to PST/PDT datetime-local format
// This is the inverse of convertPSTToUTC
export function convertUTCToPSTLocal(utcISOString: string): string {
  if (!utcISOString) return utcISOString;
  
  // Parse the UTC date
  const utcDate = new Date(utcISOString);
  
  // Convert to PST/PDT timezone
  const pstDate = new Date(utcDate.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles'
  }));
  
  // Format as datetime-local string (YYYY-MM-DDTHH:mm)
  const year = pstDate.getFullYear();
  const month = String(pstDate.getMonth() + 1).padStart(2, '0');
  const day = String(pstDate.getDate()).padStart(2, '0');
  const hours = String(pstDate.getHours()).padStart(2, '0');
  const minutes = String(pstDate.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}