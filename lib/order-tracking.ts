import type { CancellationStatus, OrderStatus } from "@/types/order";

const ORDER_NUMBER_PATTERN = /^SD-\d{8}-[A-Z0-9]{8}$/;

export class TrackingValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    super(Object.values(fieldErrors)[0] ?? "Check the highlighted fields.");
    this.name = "TrackingValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export function normalizeOrderNumber(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function isValidOrderNumber(value: string): boolean {
  return ORDER_NUMBER_PATTERN.test(value);
}

/**
 * Accepts the 11-digit local form and the 13-digit `880` form, then stores the
 * canonical local form so customer input cannot create duplicate lookups.
 */
export function normalizeBangladeshPhone(value: unknown): string {
  if (typeof value !== "string") return "";
  const digits = value.replace(/[^0-9]/g, "");

  if (digits.length === 13 && digits.startsWith("880")) {
    return `0${digits.slice(3)}`;
  }

  return /^01[3-9]\d{8}$/.test(digits) ? digits : "";
}

export function isValidBangladeshPhone(value: string): boolean {
  return /^01[3-9]\d{8}$/.test(value);
}

export interface TrackingInput {
  orderNumber: string;
  phone: string;
}

export function readTrackingInput(input: {
  orderNumber?: unknown;
  phone?: unknown;
}): TrackingInput {
  const orderNumber = normalizeOrderNumber(input.orderNumber);
  const phone = normalizeBangladeshPhone(input.phone);
  const fieldErrors: Record<string, string> = {};

  if (!isValidOrderNumber(orderNumber)) {
    fieldErrors.orderNumber = "Enter the order number from your confirmation email or page.";
  }
  if (!phone) {
    fieldErrors.phone = "Enter the phone number used when you placed the order.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new TrackingValidationError(fieldErrors);
  }

  return { orderNumber, phone };
}

export function canCustomerRequestCancellation(
  status: OrderStatus,
  cancellationStatus: CancellationStatus,
): boolean {
  return (
    (status === "pending" || status === "confirmed" || status === "processing") &&
    cancellationStatus !== "requested" &&
    cancellationStatus !== "approved" &&
    cancellationStatus !== "rejected"
  );
}
