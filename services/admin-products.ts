import "server-only";

import { assertUuid, slugify, ValidationError } from "@/lib/admin-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/services/authorization";
import { toImagePaths } from "@/services/parsers";
import type { BrandRow, CategoryRow, ProductRow } from "@/types/database";

export const LOW_STOCK_THRESHOLD = 5;
const BUCKET_ID = "product-images";

export interface AdminProductInput {
  name: string;
  sku: string | null;
  brandId: string;
  categoryId: string | null;
  description: string | null;
  shortDescription: string | null;
  regularPriceTaka: number;
  salePriceTaka: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  lowStockThreshold: number;
  stockQuantity: number;
  expiryDate: string | null;
  ingredients: string[];
  benefits: string[];
  usageInstructions: string[];
  isFeatured: boolean;
  isActive: boolean;
}

export interface AdminProductFilters {
  query?: string;
  brandId?: string;
  categoryId?: string;
  active?: "all" | "active" | "inactive";
  stock?: "all" | "in" | "low" | "out";
  sort?: "newest" | "name" | "stock" | "price";
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  brandId: string;
  brandName: string;
  categoryId: string | null;
  categoryName: string;
  description: string;
  shortDescription: string;
  regularPrice: number;
  salePrice: number | null;
  discountPercentage: number;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  lowStockThreshold: number;
  stockQuantity: number;
  expiryDate: string | null;
  imagePaths: string[];
  ingredients: string[];
  benefits: string[];
  usageInstructions: string[];
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

const ADMIN_PRODUCT_SELECT = `
  id, name, slug, sku, brand_id, category_id, description, short_description,
  regular_price, sale_price, sale_starts_at, sale_ends_at,
  discount_percentage, low_stock_threshold, stock_quantity, images, ingredients, benefits,
  usage_instructions, expiry_date, is_featured, is_active, created_at, updated_at,
  brands(id, name), categories(id, name)
`;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toPoisha(taka: number): number {
  return Math.round(taka * 100);
}

function validateInput(input: AdminProductInput): void {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) errors.name = "Product name is required.";
  else if (input.name.trim().length > 160) {
    errors.name = "Product name must be 160 characters or fewer.";
  }
  if (input.sku && input.sku.trim().length > 80) {
    errors.sku = "SKU must be 80 characters or fewer.";
  }
  if (input.shortDescription && input.shortDescription.trim().length > 240) {
    errors.shortDescription = "Short description must be 240 characters or fewer.";
  }
  if (input.description && input.description.trim().length > 5000) {
    errors.description = "Description must be 5000 characters or fewer.";
  }
  assertUuid(input.brandId, "brandId");
  if (input.categoryId) assertUuid(input.categoryId, "categoryId");

  if (!Number.isFinite(input.regularPriceTaka) || input.regularPriceTaka < 0) {
    errors.regularPrice = "Enter a valid regular price.";
  }
  if (
    input.salePriceTaka !== null &&
    (!Number.isFinite(input.salePriceTaka) ||
      input.salePriceTaka < 0 ||
      input.salePriceTaka > input.regularPriceTaka)
  ) {
    errors.salePrice = "Sale price cannot exceed the regular price.";
  }
  const starts = input.saleStartsAt ? Date.parse(input.saleStartsAt) : null;
  const ends = input.saleEndsAt ? Date.parse(input.saleEndsAt) : null;
  if (input.saleStartsAt && starts === null) {
    errors.saleStartsAt = "Enter a valid offer start date.";
  }
  if (input.saleEndsAt && ends === null) {
    errors.saleEndsAt = "Enter a valid offer end date.";
  }
  if (
    starts !== null &&
    ends !== null &&
    (!Number.isFinite(starts) || !Number.isFinite(ends) || starts >= ends)
  ) {
    errors.saleEndsAt = "The offer end must be after the start date.";
  }
  if (
    !Number.isSafeInteger(input.lowStockThreshold) ||
    input.lowStockThreshold < 0
  ) {
    errors.lowStockThreshold = "The low-stock threshold must be zero or greater.";
  }
  if (
    !Number.isSafeInteger(input.stockQuantity) ||
    input.stockQuantity < 0
  ) {
    errors.stockQuantity = "Stock quantity must be zero or greater.";
  }
  const lists = [input.ingredients, input.benefits, input.usageInstructions];
  if (lists.some((list) => list.length > 40)) {
    errors.lists = "Use at most 40 entries per list.";
  } else if (
    lists.some((list) => list.some((entry) => entry.trim().length > 240))
  ) {
    errors.lists = "Each list entry must be 240 characters or fewer.";
  }

  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

function mapProduct(row: ProductRow): AdminProduct {
  const brand = firstRelation(row.brands);
  const category = firstRelation(row.categories);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brandId: row.brand_id,
    brandName: brand?.name ?? "Unknown brand",
    categoryId: row.category_id,
    categoryName: category?.name ?? "Uncategorised",
    description: row.description ?? "",
    shortDescription: row.short_description ?? "",
    regularPrice: row.regular_price,
    salePrice: row.sale_price,
    discountPercentage: row.discount_percentage ?? 0,
    saleStartsAt: row.sale_starts_at ?? null,
    saleEndsAt: row.sale_ends_at ?? null,
    lowStockThreshold: row.low_stock_threshold ?? LOW_STOCK_THRESHOLD,
    stockQuantity: row.stock_quantity,
    expiryDate: row.expiry_date,
    imagePaths: toImagePaths(row.images),
    ingredients: toStringList(row.ingredients),
    benefits: toStringList(row.benefits),
    usageInstructions: toStringList(row.usage_instructions),
    isFeatured: row.is_featured,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function uniqueSlug(supabase: AdminClient, name: string): Promise<string> {
  const base = slugify(name) || "product";
  const { data, error } = await supabase
    .from("products")
    .select("slug")
    .ilike("slug", `${base}%`);

  if (error) throw error;

  const taken = new Set(
    (data as { slug: string }[]).map((row) => row.slug),
  );

  if (!taken.has(base)) return base;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }

  return `${base}-${Date.now()}`;
}

function escapeSearch(value: string): string {
  return value.replace(/[,()\\]/g, " ").replace(/\s+/g, " ").trim();
}

export async function listAdminProducts(
  filters: AdminProductFilters = {},
): Promise<AdminProduct[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  let query = supabase.from("products").select(ADMIN_PRODUCT_SELECT);

  if (filters.brandId) query = query.eq("brand_id", filters.brandId);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.active === "active") query = query.eq("is_active", true);
  if (filters.active === "inactive") query = query.eq("is_active", false);

  if (filters.stock === "in") query = query.gt("stock_quantity", LOW_STOCK_THRESHOLD);
  if (filters.stock === "low") {
    query = query.gt("stock_quantity", 0).lte("stock_quantity", LOW_STOCK_THRESHOLD);
  }
  if (filters.stock === "out") query = query.eq("stock_quantity", 0);

  const term = escapeSearch(filters.query?.trim().toLowerCase() ?? "");
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,sku.ilike.%${term}%,description.ilike.%${term}%`,
    );
  }

  if (filters.sort === "name") query = query.order("name", { ascending: true });
  else if (filters.sort === "stock") query = query.order("stock_quantity", { ascending: true });
  else if (filters.sort === "price") query = query.order("regular_price", { ascending: true });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  return (data as unknown as ProductRow[]).map((row) => mapProduct(row));
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle<ProductRow>();

  if (error) throw error;
  return data ? mapProduct(data) : null;
}

async function assertBrandAndCategory(
  supabase: AdminClient,
  brandId: string,
  categoryId: string | null,
  current?: { brandId: string; categoryId: string | null },
): Promise<void> {
  const { data: brand, error: brandError } = await supabase
    .from("brands")
    .select("id, is_active")
    .eq("id", brandId)
    .maybeSingle<Pick<BrandRow, "id" | "is_active">>();
  if (brandError) throw brandError;
  if (!brand) throw new ValidationError({ brandId: "Select a valid brand." });
  if (!brand.is_active && current?.brandId !== brandId) {
    throw new ValidationError({ brandId: "Select an active brand." });
  }

  if (categoryId) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id, is_active")
      .eq("id", categoryId)
      .maybeSingle<Pick<CategoryRow, "id" | "is_active">>();
    if (categoryError) throw categoryError;
    if (!category) {
      throw new ValidationError({ categoryId: "Select a valid category." });
    }
    if (!category.is_active && current?.categoryId !== categoryId) {
      throw new ValidationError({ categoryId: "Select an active category." });
    }
  }
}

export async function createAdminProduct(
  input: AdminProductInput,
): Promise<AdminProduct> {
  validateInput(input);
  const { user } = await requireAdmin();
  const supabase = createAdminSupabaseClient();
  await assertBrandAndCategory(supabase, input.brandId, input.categoryId);

  const slug = await uniqueSlug(supabase, input.name);
  const description = input.description?.trim() || null;

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: input.name.trim(),
      slug,
      sku: input.sku?.trim() || null,
      brand_id: input.brandId,
      category_id: input.categoryId,
      description,
      short_description: input.shortDescription?.trim() || description,
      regular_price: toPoisha(input.regularPriceTaka),
      sale_price:
        input.salePriceTaka === null ? null : toPoisha(input.salePriceTaka),
      sale_starts_at: input.saleStartsAt
        ? new Date(input.saleStartsAt).toISOString()
        : null,
      sale_ends_at: input.saleEndsAt
        ? new Date(input.saleEndsAt).toISOString()
        : null,
      low_stock_threshold: input.lowStockThreshold,
      stock_quantity: input.stockQuantity,
      expiry_date: input.expiryDate,
      ingredients: input.ingredients,
      benefits: input.benefits,
      usage_instructions: input.usageInstructions,
      is_featured: input.isFeatured,
      is_active: input.isActive,
      images: [],
    })
    .select(ADMIN_PRODUCT_SELECT)
    .single<ProductRow>();

  if (error) throw error;

  if (input.stockQuantity > 0) {
    const { error: historyError } = await supabase
      .from("inventory_changes")
      .insert({
        product_id: data.id,
        previous_quantity: 0,
        new_quantity: input.stockQuantity,
        reason: "product_creation",
        changed_by: user.id,
      });
    if (historyError) throw historyError;
  }

  return mapProduct(data);
}

export async function updateAdminProduct(
  id: string,
  input: AdminProductInput,
): Promise<AdminProduct> {
  assertUuid(id);
  validateInput(input);
  const { user } = await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { data: existing, error: readError } = await supabase
    .from("products")
    .select("brand_id, category_id, stock_quantity, images")
    .eq("id", id)
    .maybeSingle<{
      brand_id: string;
      category_id: string | null;
      stock_quantity: number;
      images: unknown;
    }>();

  if (readError) throw readError;
  if (!existing) throw new Error("Product not found.");

  await assertBrandAndCategory(supabase, input.brandId, input.categoryId, {
    brandId: existing.brand_id,
    categoryId: existing.category_id,
  });

  const description = input.description?.trim() || null;
  const { data, error } = await supabase
    .from("products")
    .update({
      name: input.name.trim(),
      sku: input.sku?.trim() || null,
      brand_id: input.brandId,
      category_id: input.categoryId,
      description,
      short_description: input.shortDescription?.trim() || description,
      regular_price: toPoisha(input.regularPriceTaka),
      sale_price:
        input.salePriceTaka === null ? null : toPoisha(input.salePriceTaka),
      sale_starts_at: input.saleStartsAt
        ? new Date(input.saleStartsAt).toISOString()
        : null,
      sale_ends_at: input.saleEndsAt
        ? new Date(input.saleEndsAt).toISOString()
        : null,
      low_stock_threshold: input.lowStockThreshold,
      stock_quantity: input.stockQuantity,
      expiry_date: input.expiryDate,
      ingredients: input.ingredients,
      benefits: input.benefits,
      usage_instructions: input.usageInstructions,
      is_featured: input.isFeatured,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ADMIN_PRODUCT_SELECT)
    .single<ProductRow>();

  if (error) throw error;

  if (existing.stock_quantity !== input.stockQuantity) {
    const { error: historyError } = await supabase
      .from("inventory_changes")
      .insert({
        product_id: id,
        previous_quantity: existing.stock_quantity,
        new_quantity: input.stockQuantity,
        reason: "product_update",
        changed_by: user.id,
      });
    if (historyError) throw historyError;
  }

  // Ensure any stray absolute URL is not retained on save.
  const cleanPaths = toImagePaths(existing.images);
  if (cleanPaths.length !== (Array.isArray(existing.images) ? existing.images.length : 0)) {
    const { error: imageError } = await supabase
      .from("products")
      .update({ images: cleanPaths })
      .eq("id", id);
    if (imageError) throw imageError;
  }

  return mapProduct(data);
}

export async function deleteAdminProduct(id: string): Promise<void> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();

  const { data: product, error: readError } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .maybeSingle<{ images: unknown }>();
  if (readError) throw readError;
  if (!product) throw new Error("Product not found.");

  const paths = toImagePaths(product.images);

  // Delete the database row first. If Storage cleanup fails afterwards, the
  // catalogue is already correct and only unused objects remain.
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET_ID)
      .remove(paths);
    if (storageError) {
      console.warn("Product deleted, but some image objects remain:", storageError);
    }
  }
}

export async function setAdminProductActive(
  id: string,
  isActive: boolean,
): Promise<void> {
  assertUuid(id);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("products")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) throw error;
}

export async function updateAdminStock(
  id: string,
  quantity: number,
  reason: string = "manual_adjustment",
): Promise<void> {
  assertUuid(id);
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new ValidationError({ stockQuantity: "Enter a valid quantity." });
  }

  const { user } = await requireAdmin();
  const supabase = createAdminSupabaseClient();

  // Conditional writes make concurrent staff adjustments safe: only one update
  // can succeed for a given observed quantity, and its history row uses that
  // same observed value. A stale request retries with a fresh read.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: product, error: readError } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", id)
      .maybeSingle<{ stock_quantity: number }>();

    if (readError) throw readError;
    if (!product) throw new Error("Product not found.");
    if (product.stock_quantity === quantity) return;

    const { data: updated, error: updateError } = await supabase
      .from("products")
      .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("stock_quantity", product.stock_quantity)
      .select("id");
    if (updateError) throw updateError;
    if (!updated?.length) continue;

    const { error: historyError } = await supabase
      .from("inventory_changes")
      .insert({
        product_id: id,
        previous_quantity: product.stock_quantity,
        new_quantity: quantity,
        reason: reason.slice(0, 60) || "manual_adjustment",
        changed_by: user.id,
      });
    if (historyError) throw historyError;
    return;
  }

  throw new Error("Stock changed while saving. Review the quantity and try again.");
}

export interface InventoryChangeView {
  id: string;
  productId: string;
  productName: string;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
  createdAt: string;
}

export async function listInventoryChanges(
  productId?: string,
): Promise<InventoryChangeView[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  let query = supabase
    .from("inventory_changes")
    .select("*, products(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (productId) query = query.eq("product_id", productId);

  const { data, error } = await query;
  if (error) throw error;

  return (data as (Record<string, unknown> & {
    id: string;
    product_id: string;
    previous_quantity: number;
    new_quantity: number;
    delta: number;
    reason: string;
    created_at: string;
    products: { name: string } | { name: string }[] | null;
  })[]).map((row) => ({
    id: row.id,
    productId: row.product_id,
    productName: firstRelation(row.products)?.name ?? "Deleted product",
    previousQuantity: row.previous_quantity,
    newQuantity: row.new_quantity,
    delta: row.delta,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}
