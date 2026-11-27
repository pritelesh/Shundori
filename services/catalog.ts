import { io } from "next/cache";

import { filterProducts, sortProducts } from "@/lib/catalog-filter";
import type { SearchSuggestion } from "@/lib/catalog-search";
import { hasSupabasePublicEnv } from "@/lib/env/public";
import {
  mockBrands,
  mockCatalogProducts,
  mockCategories,
} from "@/lib/mock/catalog";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import {
  fallbackTone,
  fallbackVisual,
  monogramFor,
  toImagePaths,
  toStringArray,
} from "@/services/parsers";
import type {
  BrandRow,
  CategoryRow,
  ProductRow,
  Relation,
} from "@/types/database";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogFilters,
  CatalogImage,
  CatalogProduct,
} from "@/types/product";

/**
 * Storefront catalogue service.
 *
 * With public Supabase credentials it reads active rows through the anon key,
 * so RLS is enforced. Without credentials it serves the clearly labelled Phase
 * 3 demonstration catalogue so the existing UI keeps working locally. Query
 * errors are thrown rather than hidden behind demo data.
 */

export { currentPrice, sortProducts, toCardItem } from "@/lib/catalog-filter";
export type { SearchSuggestion } from "@/lib/catalog-search";

const BUCKET_ID = "product-images";
const BRAND_ASSET_BUCKET = "brand-assets";
const CATEGORY_ASSET_BUCKET = "category-assets";

const PRODUCT_SELECT = `
  id, name, slug, sku, brand_id, category_id, description,
  short_description, regular_price, sale_price, sale_starts_at, sale_ends_at,
  discount_percentage, low_stock_threshold, stock_quantity, images,
  ingredients, benefits, usage_instructions, expiry_date, is_featured,
  is_active, visual, tone, created_at, updated_at,
  brands(id, name, slug, logo_url),
  categories(id, name, slug, image_url)
`;

type PublicClient = ReturnType<typeof createPublicSupabaseClient>;

function firstRelation<T>(value: Relation<T> | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** True only when the local demonstration catalogue is being served. */
export function isDemoCatalogue(): boolean {
  return !hasSupabasePublicEnv();
}

/**
 * Cache Components requires at least one static param. When Supabase is
 * configured but unreachable, return a sentinel that pages turn into 404s so
 * the build succeeds and real routes are still rendered on demand.
 */
export const STATIC_PARAM_PLACEHOLDER = "__supabase_unavailable__";

export async function safeStaticParams<T extends { slug: string }>(
  loader: () => Promise<readonly T[]>,
): Promise<{ slug: string }[]> {
  try {
    const items = await loader();
    if (items.length > 0) return items.map(({ slug }) => ({ slug }));
  } catch (error) {
    console.warn(
      "Supabase static parameter discovery failed; routes will render on demand.",
      error,
    );
  }

  return [{ slug: STATIC_PARAM_PLACEHOLDER }];
}

/**
 * Search suggestions are auxiliary UI. A configured-but-failing query should
 * leave suggestions empty rather than break the entire layout; catalogue
 * pages still surface their own query errors through the route boundary.
 */
export async function getSearchIndexForHeader(): Promise<SearchSuggestion[]> {
  if (isDemoCatalogue()) return getSearchIndex();

  try {
    return await getSearchIndex();
  } catch (error) {
    console.warn("Search suggestions are temporarily unavailable.", error);
    return [];
  }
}

function mapImages(row: ProductRow, supabase: PublicClient): CatalogImage[] {
  const paths = toImagePaths(row.images);
  const visual = row.visual ?? fallbackVisual(row.slug);
  const tone = row.tone ?? fallbackTone(row.slug);

  if (paths.length === 0) {
    return [
      {
        url: null,
        alt: `${row.name} placeholder artwork`,
        visual,
        tone,
      },
    ];
  }

  return paths.slice(0, 8).map((entry, index) => {
    const url = supabase.storage.from(BUCKET_ID).getPublicUrl(entry).data.publicUrl;

    return {
      url,
      alt: `${row.name} — image ${index + 1}`,
      visual,
      tone,
    };
  });
}

type ReviewStatsEntry = { rating?: unknown; reviewCount?: unknown };

/**
 * Approved-review aggregates are public. A failed metadata query must not hide
 * the catalogue, so callers fall back to zero counts.
 */
async function getReviewStatsMap(): Promise<Record<string, ReviewStatsEntry>> {
  if (isDemoCatalogue()) return {};

  // Catalogue reads are request-specific. io() suspends during prerendering so
  // the static shell can stream without starting a fetch that will be aborted.
  await io();

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase.rpc("product_review_stats");
    if (error) throw error;
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return data as Record<string, ReviewStatsEntry>;
  } catch (error) {
    console.warn("Review statistics are temporarily unavailable.", error);
    return {};
  }
}

function statsFor(
  stats: Record<string, ReviewStatsEntry>,
  productId: string,
): { rating: number | null; reviewCount: number } {
  const entry = stats[productId];
  if (!entry) return { rating: null, reviewCount: 0 };

  const rating =
    typeof entry.rating === "number" && Number.isFinite(entry.rating)
      ? entry.rating
      : null;
  const reviewCount =
    typeof entry.reviewCount === "number" && Number.isInteger(entry.reviewCount)
      ? entry.reviewCount
      : 0;

  return { rating, reviewCount };
}

function mapProduct(
  row: ProductRow,
  supabase: PublicClient,
  stats: Record<string, ReviewStatsEntry> = {},
): CatalogProduct {
  const brand = firstRelation(row.brands);
  const category = firstRelation(row.categories);
  const review = statsFor(stats, row.id);

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    brand: brand?.name ?? "",
    brandSlug: brand?.slug ?? "",
    category: category?.name ?? "Uncategorised",
    categorySlug: category?.slug ?? "",
    description: row.description ?? row.short_description ?? "",
    shortDescription: row.short_description ?? row.description ?? "",
    regularPrice: row.regular_price,
    salePrice: row.sale_price,
    saleStartsAt: row.sale_starts_at ?? null,
    saleEndsAt: row.sale_ends_at ?? null,
    discountPercentage: row.discount_percentage ?? 0,
    lowStockThreshold: row.low_stock_threshold ?? 5,
    stockQuantity: row.stock_quantity,
    images: mapImages(row, supabase),
    benefits: toStringArray(row.benefits),
    ingredients: toStringArray(row.ingredients),
    usageInstructions: toStringArray(row.usage_instructions),
    isFeatured: row.is_featured,
    isActive: row.is_active,
    isDemo: false,
    createdAt: row.created_at,
    visual: row.visual ?? fallbackVisual(row.slug),
    tone: row.tone ?? fallbackTone(row.slug),
    rating: review.rating,
    reviewCount: review.reviewCount,
  };
}

function publicAssetUrl(
  supabase: PublicClient,
  bucket: string,
  path: unknown,
): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  return supabase.storage.from(bucket).getPublicUrl(path.trim()).data.publicUrl;
}

function mapCategory(
  row: CategoryRow,
  supabase: PublicClient,
): CatalogCategory {
  return {
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    imageUrl: publicAssetUrl(supabase, CATEGORY_ASSET_BUCKET, row.image_url),
    visual: fallbackVisual(`category-${row.slug}`),
    tone: fallbackTone(`category-${row.slug}`),
  };
}

function mapBrand(row: BrandRow, supabase: PublicClient): CatalogBrand {
  return {
    slug: row.slug,
    name: row.name,
    introduction:
      row.description ?? `Explore the ${row.name} collection at Shundori.`,
    monogram: monogramFor(row.name),
    logoUrl: publicAssetUrl(supabase, BRAND_ASSET_BUCKET, row.logo_url),
  };
}

/** Escapes characters that would otherwise alter a PostgREST `or` filter. */
function escapeOrTerm(value: string): string {
  // Commas and parentheses delimit PostgREST `or` conditions; backslashes can
  // escape them. `%` is intentionally kept because it is the ilike wildcard.
  return value.replace(/[,()\\]/g, " ").replace(/\s+/g, " ").trim();
}

async function resolveCategoryId(slug: string): Promise<string | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return data?.id ?? null;
}

async function resolveBrandId(slug: string): Promise<string | null> {
  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();

  if (error) throw error;
  return data?.id ?? null;
}

async function findMatchingRelationIds(
  supabase: PublicClient,
  table: "brands" | "categories",
  term: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("is_active", true)
    .ilike("name", `%${term}%`);

  if (error) throw error;
  return (data as { id: string }[]).map((row) => row.id);
}

export async function listProducts(
  filters: CatalogFilters = {},
): Promise<CatalogProduct[]> {
  if (isDemoCatalogue()) {
    return sortProducts(
      filterProducts(mockCatalogProducts, filters),
      filters.sort ?? "featured",
    );
  }

  const supabase = createPublicSupabaseClient();
  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true);

  if (filters.category) {
    const categoryId = await resolveCategoryId(filters.category);
    if (!categoryId) return [];
    query = query.eq("category_id", categoryId);
  }

  if (filters.brand) {
    const brandId = await resolveBrandId(filters.brand);
    if (!brandId) return [];
    query = query.eq("brand_id", brandId);
  }

  if (filters.availability === "in-stock") {
    query = query.gt("stock_quantity", 0);
  }

  const term = escapeOrTerm(filters.query?.trim().toLowerCase() ?? "");
  if (term) {
    // Resolve brand/category names first so PostgREST can OR across the
    // product fields and both foreign-key relations in one query.
    const [brandIds, categoryIds] = await Promise.all([
      findMatchingRelationIds(supabase, "brands", term),
      findMatchingRelationIds(supabase, "categories", term),
    ]);

    const conditions = [
      `name.ilike.%${term}%`,
      `description.ilike.%${term}%`,
      `sku.ilike.%${term}%`,
      ...brandIds.map((id) => `brand_id.eq.${id}`),
      ...categoryIds.map((id) => `category_id.eq.${id}`),
    ];

    query = query.or(conditions.join(","));
  }

  const [stats, { data, error }] = await Promise.all([
    getReviewStatsMap(),
    query,
  ]);
  if (error) throw error;

  const products = (data as unknown as ProductRow[]).map((row) =>
    mapProduct(row, supabase, stats),
  );

  // Price filters use the effective selling price (sale price when present),
  // which is derived after mapping the integer poisha values.
  return sortProducts(
    filterProducts(products, {
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
      availability: filters.availability,
    }),
    filters.sort ?? "featured",
  );
}

export async function getProductBySlug(
  slug: string,
): Promise<CatalogProduct | undefined> {
  if (isDemoCatalogue()) {
    return mockCatalogProducts.find(
      (product) => product.slug === slug && product.isActive,
    );
  }

  const supabase = createPublicSupabaseClient();
  const [stats, { data, error }] = await Promise.all([
    getReviewStatsMap(),
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle<ProductRow>(),
  ]);

  if (error) throw error;
  return data ? mapProduct(data, supabase, stats) : undefined;
}

/** Loads active products by id, preserving caller-supplied ordering. */
export async function getProductsByIds(
  ids: readonly string[],
): Promise<CatalogProduct[]> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return [];
  if (isDemoCatalogue()) {
    return unique
      .map((id) =>
        mockCatalogProducts.find(
          (product) => product.id === id && product.isActive,
        ),
      )
      .filter((product): product is CatalogProduct => Boolean(product));
  }

  const supabase = createPublicSupabaseClient();
  const [stats, { data, error }] = await Promise.all([
    getReviewStatsMap(),
    supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .in("id", unique)
      .eq("is_active", true),
  ]);
  if (error) throw error;

  const products = new Map(
    (data as unknown as ProductRow[]).map((row) => [
      row.id,
      mapProduct(row, supabase, stats),
    ]),
  );

  return unique
    .map((id) => products.get(id))
    .filter((product): product is CatalogProduct => Boolean(product));
}

export async function getFeaturedProducts(
  limit = 8,
): Promise<CatalogProduct[]> {
  const products = await listProducts({ sort: "featured" });
  return products.filter((product) => product.isFeatured).slice(0, limit);
}

export async function getNewArrivals(limit = 8): Promise<CatalogProduct[]> {
  const products = await listProducts({ sort: "newest" });
  return products.slice(0, limit);
}

export async function getRelatedProducts(
  product: CatalogProduct,
  limit = 4,
): Promise<CatalogProduct[]> {
  const [sameCategory, sameBrand] = await Promise.all([
    product.categorySlug ? listProducts({ category: product.categorySlug }) : [],
    product.brandSlug ? listProducts({ brand: product.brandSlug }) : [],
  ]);

  const combined = [
    ...sameCategory.filter((candidate) => candidate.id !== product.id),
    ...sameBrand.filter((candidate) => candidate.id !== product.id),
  ].filter(
    (candidate, index, all) =>
      all.findIndex((other) => other.id === candidate.id) === index,
  );

  return combined.slice(0, limit);
}

export async function listCategories(): Promise<CatalogCategory[]> {
  if (isDemoCatalogue()) return mockCategories;

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as CategoryRow[]).map((row) => mapCategory(row, supabase));
}

export async function getCategoryBySlug(
  slug: string,
): Promise<CatalogCategory | undefined> {
  if (isDemoCatalogue()) {
    return mockCategories.find((category) => category.slug === slug);
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<CategoryRow>();

  if (error) throw error;
  return data ? mapCategory(data, supabase) : undefined;
}

export async function countProductsByCategory(slug: string): Promise<number> {
  if (isDemoCatalogue()) {
    return mockCatalogProducts.filter(
      (product) => product.categorySlug === slug,
    ).length;
  }

  const categoryId = await resolveCategoryId(slug);
  if (!categoryId) return 0;

  const supabase = createPublicSupabaseClient();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("category_id", categoryId);

  if (error) throw error;
  return count ?? 0;
}

export async function listBrands(): Promise<CatalogBrand[]> {
  if (isDemoCatalogue()) return mockBrands;

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return (data as BrandRow[]).map((row) => mapBrand(row, supabase));
}

export async function getBrandBySlug(
  slug: string,
): Promise<CatalogBrand | undefined> {
  if (isDemoCatalogue()) {
    return mockBrands.find((brand) => brand.slug === slug);
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle<BrandRow>();

  if (error) throw error;
  return data ? mapBrand(data, supabase) : undefined;
}

export async function countProductsByBrand(slug: string): Promise<number> {
  if (isDemoCatalogue()) {
    return mockCatalogProducts.filter((product) => product.brandSlug === slug)
      .length;
  }

  const brandId = await resolveBrandId(slug);
  if (!brandId) return 0;

  const supabase = createPublicSupabaseClient();
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("brand_id", brandId);

  if (error) throw error;
  return count ?? 0;
}

/** Compact index passed from the server header into client-side search UI. */
export async function getSearchIndex(): Promise<SearchSuggestion[]> {
  const [products, brands, categories] = await Promise.all([
    listProducts(),
    listBrands(),
    listCategories(),
  ]);

  return [
    ...products.map((product) => ({
      type: "product" as const,
      label: product.name,
      detail: product.brand,
      href: `/product/${product.slug}`,
    })),
    ...brands.map((brand) => ({
      type: "brand" as const,
      label: brand.name,
      detail: "Brand collection",
      href: `/brand/${brand.slug}`,
    })),
    ...categories.map((category) => ({
      type: "category" as const,
      label: category.name,
      detail: "Category",
      href: `/category/${category.slug}`,
    })),
  ];
}
