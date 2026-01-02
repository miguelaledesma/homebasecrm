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

