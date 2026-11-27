/**
 * Small, dependency-free validators shared by admin Server Actions and
 * services. FormData is untrusted input, so every field is coerced explicitly
 * and checked before it reaches a database write.
 */

export class ValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>) {
    const message = Object.values(fieldErrors)[0] ?? "Invalid input.";
    super(message);
    this.name = "ValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export function readString(
  formData: FormData,
  name: string,
  maxLength?: number,
): string {
  const value = formData.get(name);
  const text = typeof value === "string" ? value.trim() : "";
  return maxLength === undefined ? text : text.slice(0, maxLength);
}

export function readBoolean(formData: FormData, name: string): boolean {
  const value = formData.get(name);
  return value === "on" || value === "true" || value === "1";
}

export function readInteger(
  formData: FormData,
  name: string,
): number | null {
  const raw = readString(formData, name);
  if (!raw) return null;

  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function readDate(formData: FormData, name: string): string | null {
  const raw = readString(formData, name);
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  // Date parsing rolls over impossible calendar days (e.g. 2026-02-31), so
  // require the parsed UTC date to round-trip to the exact submitted value.
  return date.toISOString().slice(0, 10) === raw ? raw : null;
}

/**
 * Reads an HTML `datetime-local` value as Asia/Dhaka time. Existing ISO values
 * are preserved. Invalid input returns null so services can report a field
 * error without throwing from Date parsing.
 */
export function readDateTime(formData: FormData, name: string): string | null {
  const raw = readString(formData, name);
  if (!raw) return null;

  let candidate = raw;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    candidate = `${raw}:00+06:00`;
  }

  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Accepts newline- or comma-separated lists and removes empty entries. */
export function readList(formData: FormData, name: string): string[] {
  return readString(formData, name)
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function assertRequired(
  values: Record<string, string>,
  labels: Record<string, string>,
): void {
  const errors: Record<string, string> = {};

  for (const [field, label] of Object.entries(labels)) {
    if (!values[field]) errors[field] = `${label} is required.`;
  }

  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

export function assertUuid(value: string, field = "id"): void {
  const pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!pattern.test(value)) {
    throw new ValidationError({ [field]: "A valid identifier is required." });
  }
}

export function assertEmail(value: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new ValidationError({ email: "Enter a valid email address." });
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

export function fieldErrorsOf(error: unknown): Record<string, string> {
  return error instanceof ValidationError ? error.fieldErrors : {};
}
