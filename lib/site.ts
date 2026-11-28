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
  tagline: "Authentic beauty, delivered.",
  description:
    "Shundori is a cosmetics and skincare storefront in Bangladesh with clear prices, islandwide delivery and cash on delivery.",
  url: resolveSiteUrl(),
  locale: "en_BD",
  country: "Bangladesh",
  currency: "BDT",
} as const;

/**
 * Homepage hero copy. Kept here so presentation components never hardcode
 * customer-facing headlines or calls to action. `{currency}` is filled from the
 * public store settings at render time.
 */
export const heroCopy = {
  eyebrow: { en: "Curated beauty", bn: "নির্বাচিত সৌন্দর্য" },
  headline: [
    { en: "Everyday beauty,", bn: "দৈনন্দিক সৌন্দর্য," },
    { en: "made simple.", bn: "সহজভাবে।" },
  ],
  accent: { en: "naturally.", bn: "স্বাভাবিকভাবে" },
  subcopy: {
    en: "Skincare, makeup, haircare and body care. Prices in {currency}.",
    bn: "স্কিনকেয়ার, মেকআপ, হেয়ারকেয়ার ও বডি কেয়ার। দাম {currency} এ দেখানো হয়।",
  },
  primaryCta: { en: "Shop Now", bn: "এখনই কিনুন" },
  secondaryCta: { en: "View Offers", bn: "অফার দেখুন" },
  primaryHref: "/shop",
  secondaryHref: "#offers",
} as const;

/**
 * Homepage hero image. Leave `src` empty to show the illustrated fallback; set
 * it to a local `/public` path or an approved Supabase Storage URL later.
 */
export const heroImage = {
  src: "",
  alt: "Shundori beauty essentials",
} as const;

/**
 * Homepage trust row. Each entry is a claim that can be backed by public site
 * metadata, an enabled payment method, delivery settings or a live help route.
 * Do not add lab/ingredient claims here without approved evidence.
 */
export const trustItems = [
  {
    id: "authentic",
    title: "Authentic products",
    detail: "Authentic beauty, delivered.",
    icon: "shield",
  },
  {
    id: "cod",
    title: "Cash on Delivery",
    detail: "Pay the delivery partner when your order arrives.",
    icon: "banknote",
  },
  {
    id: "delivery",
    title: "Fast delivery",
    detail: "Islandwide delivery across Bangladesh.",
    icon: "truck",
  },
  {
    id: "support",
    title: "Easy support",
    detail: "Questions? Visit our help page.",
    icon: "headset",
  },
] as const;

export type TrustIconName = (typeof trustItems)[number]["icon"];

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
