import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an integer amount of rupiah as "Rp1.234.567". */
export function formatIDR(amount: number, currency = "IDR") {
  if (currency !== "IDR") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  }
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Human-readable order number like ORD-20260627-AB12CD */
export function generateOrderNumber(seed: string) {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(
    d.getDate(),
  ).padStart(2, "0")}`;
  const rand = seed.replace(/-/g, "").slice(-6).toUpperCase();
  return `ORD-${ymd}-${rand}`;
}
