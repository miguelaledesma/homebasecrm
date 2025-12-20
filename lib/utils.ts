import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format lead type enum value to human-readable label
export function formatLeadType(type: string): string {
  const typeMap: Record<string, string> = {
    FLOOR: "Floor",
    KITCHEN: "Kitchen",
    BATH: "Bath",
    CARPET: "Carpet",
    PAINTING: "Painting",
    LANDSCAPING: "Landscaping",
    MONTHLY_YARD_MAINTENANCE: "Monthly Yard Maintenance",
    ROOFING: "Roofing",
    STUCCO: "Stucco",
    ADUS: "ADU's",
    OTHER: "Other",
  }
  return typeMap[type] || type
}

// Format array of lead types for display
export function formatLeadTypes(types: string[]): string {
  return types.map(formatLeadType).join(", ")
}

