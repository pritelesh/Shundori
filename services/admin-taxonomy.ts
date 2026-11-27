import "server-only";

import { assertUuid, slugify, ValidationError } from "@/lib/admin-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/services/authorization";
import type { BrandRow, CategoryRow } from "@/types/database";

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoPath: string | null;
  logoUrl: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  imagePath: string | null;
  imageUrl: string | null;
  parentId: string | null;
  isActive: boolean;
  productCount: number;
  createdAt: string;
}

const BUCKETS = {
  brands: "brand-assets",
  categories: "category-assets",
} as const;

function asAssetPath(value: unknown, folder: "brands" | "categories"): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const valueTrimmed = value.trim();
  const relative = valueTrimmed.startsWith(`${folder}/`)
    ? valueTrimmed
    : null;
  if (relative && /^[^/]+\/[^/]+\/[^/]+$/.test(relative)) return relative;

  try {
    const parsed = new URL(valueTrimmed);
    const marker = `/storage/v1/object/public/${BUCKETS[folder]}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return null;

    const path = decodeURIComponent(
      parsed.pathname.slice(index + marker.length),
    );
    return /^[^/]+\/[^/]+\/[^/]+$/.test(path) ? path : null;
  } catch {
    return null;
  }
}

function publicUrl(
  supabase: AdminClient,
  folder: "brands" | "categories",
  path: string | null,
): string | null {
  if (!path) return null;
  return supabase.storage.from(BUCKETS[folder]).getPublicUrl(path).data.publicUrl;
}

async function uniqueSlug(
  supabase: AdminClient,
  table: "brands" | "categories",
  name: string,
): Promise<string> {
  const base = slugify(name) || table;
  const { data, error } = await supabase
    .from(table)
    .select("slug")
    .ilike("slug", `${base}%`);
  if (error) throw error;

  const taken = new Set((data as { slug: string }[]).map((row) => row.slug));
  if (!taken.has(base)) return base;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

function assertName(name: string): void {
  if (!name.trim()) throw new ValidationError({ name: "Name is required." });
  if (name.trim().length > 100) {
    throw new ValidationError({ name: "Name must be 100 characters or fewer." });
  }
}

function assertDescription(description: string | null): void {
  if (description && description.trim().length > 2000) {
    throw new ValidationError({
      description: "Description must be 2000 characters or fewer.",
    });
  }
}

export async function listAdminBrands(): Promise<AdminBrand[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  const rows = data as BrandRow[];
  const counts = await Promise.all(
    rows.map(async (row) => {
      const { count, error: countError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("brand_id", row.id);
      if (countError) throw countError;
      return count ?? 0;
    }),
  );

  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    logoPath: asAssetPath(row.logo_url, "brands"),
    logoUrl: publicUrl(supabase, "brands", asAssetPath(row.logo_url, "brands")),
    isActive: row.is_active,
    productCount: counts[index] ?? 0,
    createdAt: row.created_at,
  }));
}

export async function getAdminBrand(id: string): Promise<AdminBrand | null> {
  assertUuid(id);
  const brands = await listAdminBrands();
  return brands.find((brand) => brand.id === id) ?? null;
}

export async function createAdminBrand(input: {
  name: string;
  description: string | null;
  isActive: boolean;
}): Promise<AdminBrand> {
  assertName(input.name);
  assertDescription(input.description);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const slug = await uniqueSlug(supabase, "brands", input.name);

  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      is_active: input.isActive,
    })
    .select("*")
    .single<BrandRow>();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description ?? "",
    logoPath: null,
    logoUrl: null,
    isActive: data.is_active,
    productCount: 0,
    createdAt: data.created_at,
  };
}

export async function updateAdminBrand(
  id: string,
  input: { name: string; description: string | null; isActive: boolean },
): Promise<void> {
  assertUuid(id);
  assertName(input.name);
  assertDescription(input.description);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("brands")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function setAdminBrandActive(id: string, active: boolean): Promise<void> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("brands")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAdminBrand(id: string): Promise<void> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("brand_id", id);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Move or delete this brand's products before deleting the brand.");
  }

  const { data: brand, error: readError } = await supabase
    .from("brands")
    .select("logo_url")
    .eq("id", id)
    .maybeSingle<{ logo_url: string | null }>();
  if (readError) throw readError;

  const path = asAssetPath(brand?.logo_url, "brands");

  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw error;

  if (path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKETS.brands)
      .remove([path]);
    if (storageError) {
      console.warn("Brand deleted, but its logo object remains:", storageError);
    }
  }
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;

  const rows = data as CategoryRow[];
  const counts = await Promise.all(
    rows.map(async (row) => {
      const { count, error: countError } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("category_id", row.id);
      if (countError) throw countError;
      return count ?? 0;
    }),
  );

  return rows.map((row, index) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? "",
    imagePath: asAssetPath(row.image_url, "categories"),
    imageUrl: publicUrl(
      supabase,
      "categories",
      asAssetPath(row.image_url, "categories"),
    ),
    parentId: row.parent_id,
    isActive: row.is_active,
    productCount: counts[index] ?? 0,
    createdAt: row.created_at,
  }));
}

export async function getAdminCategory(id: string): Promise<AdminCategory | null> {
  assertUuid(id);
  const categories = await listAdminCategories();
  return categories.find((category) => category.id === id) ?? null;
}

export async function createAdminCategory(input: {
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
}): Promise<AdminCategory> {
  assertName(input.name);
  assertDescription(input.description);
  if (input.parentId) assertUuid(input.parentId, "parentId");
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const slug = await uniqueSlug(supabase, "categories", input.name);

  const { data, error } = await supabase
    .from("categories")
    .insert({
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || null,
      parent_id: input.parentId,
      is_active: input.isActive,
    })
    .select("*")
    .single<CategoryRow>();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description ?? "",
    imagePath: null,
    imageUrl: null,
    parentId: data.parent_id,
    isActive: data.is_active,
    productCount: 0,
    createdAt: data.created_at,
  };
}

export async function updateAdminCategory(
  id: string,
  input: {
    name: string;
    description: string | null;
    parentId: string | null;
    isActive: boolean;
  },
): Promise<void> {
  assertUuid(id);
  assertName(input.name);
  assertDescription(input.description);
  if (input.parentId === id) {
    throw new ValidationError({ parentId: "A category cannot be its own parent." });
  }
  if (input.parentId) assertUuid(input.parentId, "parentId");
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { error } = await supabase
    .from("categories")
    .update({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      parent_id: input.parentId,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;
}

export async function setAdminCategoryActive(
  id: string,
  active: boolean,
): Promise<void> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("categories")
    .update({ is_active: active, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAdminCategory(id: string): Promise<void> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { count, error: countError } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Move or delete this category's products before deleting it.");
  }

  const { data: category, error: readError } = await supabase
    .from("categories")
    .select("image_url")
    .eq("id", id)
    .maybeSingle<{ image_url: string | null }>();
  if (readError) throw readError;

  const path = asAssetPath(category?.image_url, "categories");

  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;

  if (path) {
    const { error: storageError } = await supabase.storage
      .from(BUCKETS.categories)
      .remove([path]);
    if (storageError) {
      console.warn("Category deleted, but its image object remains:", storageError);
    }
  }
}
