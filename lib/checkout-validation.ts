import type {
  CheckoutAddress,
  CheckoutCustomerInput,
  CheckoutLine,
} from "@/types/checkout";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class CheckoutValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(
    fieldErrors: Record<string, string>,
    message = "Check the highlighted fields and try again.",
  ) {
    super(message);
    this.name = "CheckoutValidationError";
    this.fieldErrors = fieldErrors;
  }
}

function field(formData: FormData, name: string, max: number): string {
  const value = formData.get(name);
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max + 1);
}

function normalisePhone(raw: string): string {
  const compact = raw.replace(/[\s()-]/g, "");
  const local = compact.replace(/^\+?88/, "");
  return /^01[3-9]\d{8}$/.test(local) ? local : "";
}

export function readCheckoutCustomer(
  formData: FormData,
): CheckoutCustomerInput {
  const errors: Record<string, string> = {};

  const fullName = field(formData, "fullName", 100);
  const phone = field(formData, "phone", 30);
  const email = field(formData, "email", 160);
  const division = field(formData, "division", 80);
  const district = field(formData, "district", 80);
  const upazila = field(formData, "upazila", 80);
  const addressLine1 = field(formData, "addressLine1", 500);
  const addressLine2 = field(formData, "addressLine2", 200);
  const postalCode = field(formData, "postalCode", 20);
  const notes = field(formData, "notes", 500);

  if (fullName.length < 2 || fullName.length > 100) {
    errors.fullName = "Enter your full name (2–100 characters).";
  }
  if (!normalisePhone(phone)) {
    errors.phone = "Enter a valid Bangladesh mobile number.";
  }
  if (email && (email.length > 160 || !EMAIL_PATTERN.test(email))) {
    errors.email = "Enter a valid email address or leave this blank.";
  }
  if (division.length < 2 || division.length > 80) {
    errors.division = "Select your division.";
  }
  if (district.length < 2 || district.length > 80) {
    errors.district = "Enter your district.";
  }
  if (upazila.length < 2 || upazila.length > 80) {
    errors.upazila = "Enter your upazila.";
  }
  if (addressLine1.length < 8 || addressLine1.length > 500) {
    errors.addressLine1 =
      "Enter the full delivery address (at least 8 characters).";
  }
  if (addressLine2.length > 200) {
    errors.addressLine2 = "Keep additional address details under 200 characters.";
  }
  if (postalCode && !/^\d{4,10}$/.test(postalCode)) {
    errors.postalCode = "Enter a numeric postal code or leave this blank.";
  }
  if (notes.length > 500) {
    errors.notes = "Keep delivery notes under 500 characters.";
  }

  if (Object.keys(errors).length > 0) {
    throw new CheckoutValidationError(errors);
  }

  return {
    fullName,
    phone: normalisePhone(phone),
    email: email || null,
    division,
    district,
    upazila,
    addressLine1,
    addressLine2: addressLine2 || null,
    postalCode: postalCode || null,
    notes: notes || null,
  };
}

export function toCheckoutAddress(
  customer: CheckoutCustomerInput,
): CheckoutAddress {
  return {
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    addressLine1: customer.addressLine1,
    addressLine2: customer.addressLine2,
    area: customer.upazila,
    division: customer.division,
    district: customer.district,
    upazila: customer.upazila,
    postalCode: customer.postalCode,
    country: "Bangladesh",
  };
}

export function parseCheckoutLines(value: unknown): CheckoutLine[] {
  let parsed: unknown = value;

  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      throw new CheckoutValidationError({
        cart: "Your bag could not be read. Please return to the bag and try again.",
      });
    }
  }

  if (!Array.isArray(parsed)) {
    throw new CheckoutValidationError({
      cart: "Your bag could not be read. Please return to the bag and try again.",
    });
  }

  if (parsed.length === 0 || parsed.length > 50) {
    throw new CheckoutValidationError({
      cart: "Your bag must contain between 1 and 50 items.",
    });
  }

  const seen = new Set<string>();
  const lines: CheckoutLine[] = [];

  for (const entry of parsed) {
    const record = entry && typeof entry === "object" ? entry : {};
    const productId =
      "productId" in record && typeof record.productId === "string"
        ? record.productId.trim()
        : "";
    const quantity =
      "quantity" in record && typeof record.quantity === "number"
        ? record.quantity
        : Number.NaN;

    if (!UUID_PATTERN.test(productId)) {
      throw new CheckoutValidationError({
        cart: "One or more products in your bag are invalid.",
      });
    }
    if (seen.has(productId)) {
      throw new CheckoutValidationError({
        cart: "A product can appear only once in your bag.",
      });
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new CheckoutValidationError({
        cart: "Each product quantity must be between 1 and 99.",
      });
    }

    seen.add(productId);
    lines.push({ productId, quantity });
  }

  return lines;
}

export function readIdempotencyKey(value: unknown): string {
  const key = typeof value === "string" ? value.trim() : "";
  if (!IDEMPOTENCY_PATTERN.test(key)) {
    throw new CheckoutValidationError({
      checkout: "This checkout session expired. Please try again.",
    });
  }
  return key;
}
