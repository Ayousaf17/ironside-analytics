import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// --- Formatters ---

export const formatCurrency = (val: number) => 
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val);

export const USER_MAP: Record<string, string> = {
  // You can add real names here later
  "U09BSMA8U75": "Dev Admin",
};

export const formatUser = (userId: string) => USER_MAP[userId] || userId;