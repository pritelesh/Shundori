/**
 * WhatsApp helpers. Phone numbers are normalized to international digits and
 * all user-supplied text is encoded in the URL, never interpolated into HTML.
 */
export function normalizeWhatsappNumber(value: string | null | undefined): string {
  if (!value) return "";
  const compact = value.replace(/[^\d+]/g, "");
  const local = compact.replace(/^\+?88/, "").replace(/^0/, "");
  return /^1[3-9]\d{8}$/.test(local) ? `880${local}` : "";
}

export function whatsappUrl(
  number: string | null | undefined,
  message: string,
): string | null {
  const normalized = normalizeWhatsappNumber(number);
  if (!normalized) return null;
  const text = message.trim().slice(0, 1200);
  return `https://wa.me/${normalized}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function productEnquiryMessage(
  productName: string,
  storeName: string,
): string {
  return `Hello ${storeName}, I would like to ask about ${productName}.`;
}

export function orderEnquiryMessage(orderNumber: string): string {
  return `Hello, I have a question about my Shundori order ${orderNumber}.`;
}

/** Social links are rendered only when they use a safe web scheme. */
export function safeSocialUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
