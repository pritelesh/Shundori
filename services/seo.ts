import "server-only";

import { hasSupabasePublicEnv } from "@/lib/env/public";
import { createPublicSupabaseClient } from "@/lib/supabase/public";

export interface SeoUrl {
  path: string;
  lastModified?: string;
}

const STATIC_PATHS: SeoUrl[] = [
  { path: "/" },
  { path: "/shop" },
  { path: "/about" },
  { path: "/contact" },
  { path: "/help" },
];

/**
 * Search-engine URLs come only from active, public rows. Admin, checkout and
 * account pages are deliberately absent.
 */
export async function getSitemapUrls(): Promise<SeoUrl[]> {
  const urls = [...STATIC_PATHS];
  if (!hasSupabasePublicEnv()) return urls;

  const supabase = createPublicSupabaseClient();
  const [products, categories, brands] = await Promise.all([
    supabase
      .from("products")
      .select("slug, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("categories")
      .select("slug, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("brands")
      .select("slug, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const errors = [products.error, categories.error, brands.error].filter(
    Boolean,
  );
  if (errors.length > 0) {
    console.warn("Some catalogue URLs are unavailable for the sitemap.", errors);
    return urls;
  }

  const append = (
    rows: { slug: string; created_at: string }[] | null,
    prefix: string,
  ) => {
    for (const row of rows ?? []) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug)) continue;
      urls.push({
        path: `${prefix}/${row.slug}`,
        lastModified: row.created_at,
      });
    }
  };

  append(products.data as { slug: string; created_at: string }[] | null, "/product");
  append(categories.data as { slug: string; created_at: string }[] | null, "/category");
  append(brands.data as { slug: string; created_at: string }[] | null, "/brand");

  return urls;
}
