import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const USER_NAME_MAPPINGS: Record<string, string> = {
  "silpa v": "Shoukath Ali Moosa",
  "vibin s": "Shoukath Ali Moosa",
  "sarath": "Shoukath Ali Moosa",
  "anoop vijayaraj": "Shoukath Ali Moosa",
  "shoukath": "Shoukath Ali Moosa",
};

export function normalizeUserName(name: string | null | undefined): string {
  if (!name) return "";
  
  const cleaned = name.trim().replace(/\s+/g, " ");
  const lower = cleaned.toLowerCase();
  
  if (lower in USER_NAME_MAPPINGS) {
    return USER_NAME_MAPPINGS[lower];
  }
  
  // Format as Title Case for standard normalization
  return cleaned
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
