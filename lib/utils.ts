import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, fmt = "d MMM yyyy") {
  return format(new Date(date), fmt);
}

export function formatDateTime(date: string | Date) {
  return format(new Date(date), "d MMM yyyy, h:mm a");
}

export function formatTimeAgo(date: string | Date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function isEventPast(endAt: string) {
  return isPast(new Date(endAt));
}

export function isEventUpcoming(startAt: string) {
  return isFuture(new Date(startAt));
}

export function isRegistrationOpen(
  opensAt: string | null,
  closesAt: string | null
) {
  const now = new Date();
  if (opensAt && isFuture(new Date(opensAt))) return false;
  if (closesAt && isPast(new Date(closesAt))) return false;
  return true;
}

export function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export function truncate(str: string, maxLength = 100) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "…";
}

export const EVENT_CATEGORIES = [
  { value: "technical", label: "Technical", color: "#3B82F6" },
  { value: "cultural", label: "Cultural", color: "#EC4899" },
  { value: "sports", label: "Sports", color: "#F59E0B" },
  { value: "workshop", label: "Workshop", color: "#10B981" },
  { value: "placement", label: "Placement", color: "#6366F1" },
  { value: "pharmacy", label: "Pharmacy", color: "#14B8A6" },
  { value: "seminar", label: "Seminar", color: "#8B5CF6" },
  { value: "other", label: "Other", color: "#6B7280" },
] as const;

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  COLLEGE_ADMIN: "college_admin",
  ORGANIZER: "organizer",
  SCANNER: "scanner",
  STUDENT: "student",
} as const;

export type AppRole =
  | "super_admin"
  | "college_admin"
  | "organizer"
  | "scanner"
  | "student";

export const ADMIN_ROLES: AppRole[] = [
  "super_admin",
  "college_admin",
  "organizer",
];
