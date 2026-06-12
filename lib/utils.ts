import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * يحوّل قيمة رقمية قد تكون null/undefined/NaN/Infinity إلى رقم آمن (افتراضي 0).
 * يُستخدم لتحصين العرض الرقمي ضد البيانات الناقصة أو الكاش بشكل قديم — فلا يتعطّل `.toLocaleString`.
 */
export function toSafeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}
