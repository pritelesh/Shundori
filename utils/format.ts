import type { Poisha } from "@/types/product";

const wholeTakaFormatter = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const poishaFormatter = new Intl.NumberFormat("en-BD", {
  style: "currency",
  currency: "BDT",
  currencyDisplay: "narrowSymbol",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats an integer amount stored in poisha as Bangladeshi Taka. Whole-taka
 * amounts stay compact; any non-zero poisha remainder is preserved.
 */
export function formatPrice(amountInPoisha: Poisha): string {
  const taka = amountInPoisha / 100;
  return Number.isInteger(taka)
    ? wholeTakaFormatter.format(taka)
    : poishaFormatter.format(taka);
}

/**
 * Returns the rounded discount percentage for a product, or null when the
 * product is not discounted.
 */
export function discountPercent(
  price: Poisha,
  compareAtPrice: Poisha | null,
): number | null {
  if (compareAtPrice === null || compareAtPrice <= price) {
    return null;
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/**
 * Formats an ISO date string for display in Bangladesh.
 */
export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  }).format(date);
}

/** Timestamped audit entries are displayed in Bangladesh time. */
export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Dhaka",
  }).format(date);
}
