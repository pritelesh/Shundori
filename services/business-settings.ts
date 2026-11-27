import "server-only";

import { cache } from "react";

import { ValidationError } from "@/lib/admin-validation";
import { hasSupabasePublicEnv } from "@/lib/env/public";
import { safeSocialUrl } from "@/lib/whatsapp";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { requireAdmin } from "@/services/authorization";
import type {
  SocialLinks,
  StoreSettings,
  StoreSettingsInput,
} from "@/types/phase8";
import type { StoreSettingsRow } from "@/types/database";

const STORE_BUCKET = "store-assets";

const DEFAULTS: StoreSettings = {
  storeName: "Shundori",
  storeLogoPath: null,
  contactNumber: "",
  whatsappNumber: "",
  whatsappEnabled: false,
  contactEmail: "",
  socialLinks: {},
  currency: "BDT",
  storeDescription: "",
};

function scalar(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function socialLinks(value: unknown): SocialLinks {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const result: SocialLinks = {};
  for (const [key, raw] of Object.entries(value)) {
    const url = safeSocialUrl(raw);
    if (url && ["facebook", "instagram", "youtube", "tiktok"].includes(key)) {
      result[key as keyof SocialLinks] = url;
    }
  }
  return result;
}

interface StoreSettingsRpc {
  storeName?: unknown;
  storeLogoPath?: unknown;
  contactNumber?: unknown;
  whatsappNumber?: unknown;
  whatsappEnabled?: unknown;
  contactEmail?: unknown;
  socialLinks?: unknown;
  currency?: unknown;
  storeDescription?: unknown;
}

/**
 * Public-safe settings exposed through a narrow definer function. React cache
 * deduplicates this RPC across header, footer and WhatsApp islands per request.
 */
export const getPublicStoreSettings = cache(async function getPublicStoreSettings(): Promise<StoreSettings> {
  const fallback = { ...DEFAULTS };
  if (!hasSupabasePublicEnv()) return fallback;

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.rpc("get_store_settings");
    if (error) throw error;

    const row = (data ?? {}) as StoreSettingsRpc;
    return {
      storeName: scalar(row.storeName) || fallback.storeName,
      storeLogoPath: scalar(row.storeLogoPath) || null,
      contactNumber: scalar(row.contactNumber),
      whatsappNumber: scalar(row.whatsappNumber),
      whatsappEnabled: row.whatsappEnabled === true,
      contactEmail: scalar(row.contactEmail),
      socialLinks: socialLinks(row.socialLinks),
      currency: scalar(row.currency) || "BDT",
      storeDescription: scalar(row.storeDescription),
    };
  } catch (error) {
    console.warn("Store settings are temporarily unavailable.", error);
    return fallback;
  }
});

export async function getAdminStoreSettings(): Promise<StoreSettings> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("key, value, updated_at");

  if (error) throw error;

  const values = new Map(
    (data as StoreSettingsRow[]).map((row) => [row.key, row.value]),
  );
  const get = (key: string): unknown => values.get(key);

  return {
    storeName: scalar(get("store_name")) || DEFAULTS.storeName,
    storeLogoPath: scalar(get("store_logo_path")) || null,
    contactNumber: scalar(get("contact_number")),
    whatsappNumber: scalar(get("whatsapp_number")),
    whatsappEnabled: get("whatsapp_enabled") === true,
    contactEmail: scalar(get("contact_email")),
    socialLinks: socialLinks(get("social_links")),
    currency: scalar(get("currency")) || "BDT",
    storeDescription: scalar(get("store_description")),
  };
}

function validateInput(input: StoreSettingsInput): void {
  const errors: Record<string, string> = {};
  if (!input.storeName.trim() || input.storeName.trim().length > 80) {
    errors.storeName = "Store name must be 1–80 characters.";
  }
  if (input.contactNumber.length > 40 || input.whatsappNumber.length > 40) {
    errors.contactNumber = "Contact numbers must be 40 characters or fewer.";
  }
  if (
    input.contactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)
  ) {
    errors.contactEmail = "Enter a valid email address.";
  }
  if (input.storeDescription.length > 1000) {
    errors.storeDescription = "Description must be 1000 characters or fewer.";
  }
  if (input.currency.trim().length > 10) {
    errors.currency = "Currency must be 10 characters or fewer.";
  }

  const links = Object.entries(input.socialLinks).filter(([, value]) => value);
  if (links.some(([, value]) => safeSocialUrl(value) === null)) {
    errors.socialLinks = "Social links must start with http:// or https://.";
  }

  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

export async function updateAdminStoreSettings(
  input: StoreSettingsInput,
): Promise<StoreSettings> {
  validateInput(input);
  await requireAdmin();

  const cleanLinks: Record<string, string> = {};
  for (const [key, value] of Object.entries(input.socialLinks)) {
    const url = safeSocialUrl(value);
    if (url) cleanLinks[key] = url;
  }

  const values: Record<string, unknown> = {
    store_name: input.storeName.trim(),
    contact_number: input.contactNumber.trim(),
    whatsapp_number: input.whatsappNumber.trim(),
    whatsapp_enabled: input.whatsappEnabled,
    contact_email: input.contactEmail.trim(),
    social_links: cleanLinks,
    currency: input.currency.trim() || "BDT",
    store_description: input.storeDescription.trim(),
  };
  if (input.storeLogoPath !== undefined) {
    values.store_logo_path = input.storeLogoPath;
  }

  const supabase = createAdminSupabaseClient();
  for (const [key, value] of Object.entries(values)) {
    const { error } = await supabase.from("store_settings").upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (error) throw error;
  }

  return getAdminStoreSettings();
}

export function getStoreAssetUrl(path: string | null | undefined): string | null {
  if (!path || !hasSupabasePublicEnv()) return null;
  const supabase = createPublicSupabaseClient();
  return supabase.storage.from(STORE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Uploads a square-ish logo to a fixed public path and records it in settings. */
export async function uploadStoreLogo(file: File): Promise<string> {
  await requireAdmin();
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    throw new ValidationError({ logo: "Use a JPG, PNG or WebP image." });
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new ValidationError({ logo: "Logo must be 5 MB or smaller." });
  }

  const extension =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `store/logo-${Date.now()}.${extension}`;
  const supabase = createAdminSupabaseClient();

  const { error: uploadError } = await supabase.storage
    .from(STORE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const current = await getAdminStoreSettings();
  const { error: settingError } = await supabase.from("store_settings").upsert(
    {
      key: "store_logo_path",
      value: path,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (settingError) throw settingError;

  if (current.storeLogoPath && current.storeLogoPath !== path) {
    const { error: removeError } = await supabase.storage
      .from(STORE_BUCKET)
      .remove([current.storeLogoPath]);
    if (removeError) console.warn("Old store logo could not be removed.", removeError);
  }

  return path;
}
