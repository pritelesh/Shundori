const FALLBACK_SITE_URL = "http://localhost:3000";

function resolveSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredUrl) {
    return FALLBACK_SITE_URL;
  }

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return FALLBACK_SITE_URL;
  }
}

/**
 * Static, non-secret site metadata shared across the application.
 */
export const siteConfig = {
  name: "Shundori",
  tagline: "Beauty, thoughtfully curated.",
  description:
    "Shundori is a premium cosmetics and skincare destination in Bangladesh, offering a considered edit of beauty essentials.",
  url: resolveSiteUrl(),
  locale: "en_BD",
  country: "Bangladesh",
  currency: "BDT",
} as const;

/**
 * Contact placeholders. Fill these in when real business details are
 * approved — never invent an address, phone number or email here.
 */
export const contactPlaceholders = {
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "Dhaka",
  country: "Bangladesh",
  businessHours: "",
} as const;
