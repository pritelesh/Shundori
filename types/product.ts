/**
 * Monetary values are stored as integers in the smallest currency unit
 * (poisha for BDT) to avoid floating-point rounding errors.
 */
export type Poisha = number;

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  position: number;
}

export type ProductStatus = "draft" | "active" | "archived";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  sku: string | null;
  brandId: string;
  categoryId: string | null;
  price: Poisha;
  compareAtPrice: Poisha | null;
  stockQuantity: number;
  status: ProductStatus;
  isFeatured: boolean;
  images: ProductImage[];
  brand?: Brand;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

/**
 * Lightweight product shape for listing pages and cards.
 */
export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  brandName: string | null;
  price: Poisha;
  compareAtPrice: Poisha | null;
  imageUrl: string | null;
  imageAlt: string | null;
  inStock: boolean;
}

/**
 * Placeholder product artwork. Real photography replaces these shapes once
 * the catalogue is supplied; see `components/products/product-visual.tsx`.
 */
export type ProductVisualShape =
  | "dropper"
  | "bottle"
  | "jar"
  | "tube"
  | "compact"
  | "lipstick"
  | "perfume"
  | "mist";

export type ProductTone = "pink" | "emerald" | "charcoal" | "cream";

/**
 * Everything a product card needs. Optional fields are absent when the data
 * source does not provide them (for example a product without reviews).
 */
export interface ProductCardItem extends ProductSummary {
  categoryName?: string | null;
  rating?: number | null;
  reviewCount?: number;
  stockQuantity?: number;
  visual?: ProductVisualShape;
  tone?: ProductTone;
}

/**
 * Placeholder artwork used until verified product photography is supplied.
 * `url` is null for CSS artwork; a real URL takes precedence when present.
 */
export interface CatalogImage {
  url: string | null;
  alt: string;
  visual: ProductVisualShape;
  tone: ProductTone;
}

/**
 * Customer-facing catalogue shape used by Phase 3 pages.
 *
 * The field names intentionally mirror the Supabase tables planned for the
 * next phase (`regularPrice`/`salePrice` map to `price`/`compareAtPrice`,
 * `brand`/`category` map to foreign-key relations). Everything in the current
 * catalogue is demonstration data and is marked as such with `isDemo`.
 */
export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  brand: string;
  brandSlug: string;
  category: string;
  categorySlug: string;
  description: string;
  shortDescription: string;
  regularPrice: Poisha;
  salePrice: Poisha | null;
  /** Offer scheduling fields are optional for demonstration catalogue rows. */
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
  discountPercentage?: number;
  lowStockThreshold?: number;
  stockQuantity: number;
  images: CatalogImage[];
  benefits: string[];
  ingredients: string[];
  usageInstructions: string[];
  isFeatured: boolean;
  isActive: boolean;
  isDemo: boolean;
  createdAt: string;
  visual: ProductVisualShape;
  tone: ProductTone;
  rating: number | null;
  reviewCount: number;
}

export interface CatalogCategory {
  slug: string;
  name: string;
  description: string;
  imageUrl?: string | null;
  visual: ProductVisualShape;
  tone: ProductTone;
}

export interface CatalogBrand {
  slug: string;
  name: string;
  introduction: string;
  monogram: string;
  logoUrl?: string | null;
}

export type CatalogSort =
  | "featured"
  | "newest"
  | "price-asc"
  | "price-desc"
  | "name-asc";

export interface CatalogFilters {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: "all" | "in-stock";
  sort?: CatalogSort;
  query?: string;
}
