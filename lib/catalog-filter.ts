import {
  effectiveCompareAtPrice,
  effectivePrice,
} from "@/lib/offer-pricing";
import type {
  CatalogFilters,
  CatalogProduct,
  ProductCardItem,
} from "@/types/product";

/**
 * Pure catalogue filtering/sorting helpers shared by server pages and the
 * client-side filter panel. No data source is imported here.
 */

export function currentPrice(product: CatalogProduct): number {
  return effectivePrice(product);
}

export function filterProducts(
  items: readonly CatalogProduct[],
  filters: CatalogFilters = {},
): CatalogProduct[] {
  const query = filters.query?.trim().toLowerCase();

  return items.filter((product) => {
    if (!product.isActive) return false;
    if (filters.category && product.categorySlug !== filters.category) return false;
    if (filters.brand && product.brandSlug !== filters.brand) return false;
    if (
      typeof filters.minPrice === "number" &&
      currentPrice(product) < filters.minPrice
    ) {
      return false;
    }
    if (
      typeof filters.maxPrice === "number" &&
      currentPrice(product) > filters.maxPrice
    ) {
      return false;
    }
    if (filters.availability === "in-stock" && product.stockQuantity <= 0) {
      return false;
    }
    if (query) {
      const haystack = [
        product.name,
        product.brand,
        product.category,
        product.sku ?? "",
        product.description,
        product.shortDescription,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

/** Maps a catalogue record to the shape used by the reusable product card. */
export function toCardItem(product: CatalogProduct): ProductCardItem & { href: string } {
  const firstImage = product.images[0];

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandName: product.brand,
    categoryName: product.category,
    price: currentPrice(product),
    compareAtPrice: effectiveCompareAtPrice(product),
    imageUrl: firstImage?.url ?? null,
    imageAlt: firstImage?.alt ?? null,
    inStock: product.stockQuantity > 0,
    stockQuantity: product.stockQuantity,
    rating: product.rating,
    reviewCount: product.reviewCount,
    visual: firstImage?.visual ?? product.visual,
    tone: firstImage?.tone ?? product.tone,
    href: `/product/${product.slug}`,
  };
}

export function sortProducts(
  items: readonly CatalogProduct[],
  sort: CatalogFilters["sort"] = "featured",
): CatalogProduct[] {
  const sorted = [...items];

  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "price-asc":
      return sorted.sort((a, b) => currentPrice(a) - currentPrice(b));
    case "price-desc":
      return sorted.sort((a, b) => currentPrice(b) - currentPrice(a));
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "featured":
    default:
      return sorted.sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        if (a.stockQuantity === 0 && b.stockQuantity > 0) return 1;
        if (b.stockQuantity === 0 && a.stockQuantity > 0) return -1;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }
}
