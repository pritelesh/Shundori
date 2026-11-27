"use client";

import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { ProductGrid } from "@/components/catalog/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { buttonStyles } from "@/components/ui/button";
import { filterProducts, sortProducts } from "@/lib/catalog-filter";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogFilters,
  CatalogProduct,
  CatalogSort,
} from "@/types/product";
import { formatPrice } from "@/utils/format";

export interface CatalogBrowserProps {
  products: readonly CatalogProduct[];
  categories: readonly CatalogCategory[];
  brands: readonly CatalogBrand[];
  initialFilters?: CatalogFilters;
  pageSize?: number;
  lockedCategory?: string;
  lockedBrand?: string;
  showSearch?: boolean;
}

const sortLabels: Record<CatalogSort, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc": "Name: A to Z",
};

/**
 * Interactive catalogue browser shared by /shop, /category/[slug],
 * /brand/[slug] and /search. Filtering runs locally on the records supplied
 * by the server catalogue service (demo or Supabase-backed).
 */
export function CatalogBrowser({
  products,
  categories,
  brands,
  initialFilters = {},
  pageSize = 8,
  lockedCategory,
  lockedBrand,
  showSearch = true,
}: CatalogBrowserProps) {
  const idPrefix = useId();
  const [query, setQuery] = useState(initialFilters.query ?? "");
  const [category, setCategory] = useState(initialFilters.category ?? "");
  const [brand, setBrand] = useState(initialFilters.brand ?? "");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<CatalogSort>(initialFilters.sort ?? "featured");
  const [visible, setVisible] = useState(pageSize);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useMemo(() => {
    const parsedMin = Number(minPrice);
    const parsedMax = Number(maxPrice);

    return sortProducts(
      filterProducts(products, {
        query: query.trim() || undefined,
        category: lockedCategory ?? (category || undefined),
        brand: lockedBrand ?? (brand || undefined),
        minPrice: minPrice && Number.isFinite(parsedMin) ? parsedMin * 100 : undefined,
        maxPrice: maxPrice && Number.isFinite(parsedMax) ? parsedMax * 100 : undefined,
        availability: inStockOnly ? "in-stock" : "all",
      }),
      sort,
    );
  }, [
    products,
    query,
    category,
    brand,
    minPrice,
    maxPrice,
    inStockOnly,
    sort,
    lockedCategory,
    lockedBrand,
  ]);

  const resetVisible = () => setVisible(pageSize);

  const updateQuery = (value: string) => {
    setQuery(value);
    resetVisible();
  };

  const updateCategory = (value: string) => {
    setCategory(value);
    resetVisible();
  };

  const updateBrand = (value: string) => {
    setBrand(value);
    resetVisible();
  };

  const updateMinPrice = (value: string) => {
    setMinPrice(value);
    resetVisible();
  };

  const updateMaxPrice = (value: string) => {
    setMaxPrice(value);
    resetVisible();
  };

  const updateAvailability = (value: boolean) => {
    setInStockOnly(value);
    resetVisible();
  };

  const updateSort = (value: CatalogSort) => {
    setSort(value);
    resetVisible();
  };

  const clearAll = () => {
    setQuery(initialFilters.query ?? "");
    setCategory("");
    setBrand("");
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
    setSort(initialFilters.sort ?? "featured");
    resetVisible();
  };

  const hasFilters =
    Boolean(query) ||
    Boolean(category) ||
    Boolean(brand) ||
    Boolean(minPrice) ||
    Boolean(maxPrice) ||
    inStockOnly;

  const fieldId = (name: string) => `${idPrefix}-${name}`;

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted" aria-live="polite">
          <span className="font-semibold text-charcoal">{results.length}</span>{" "}
          {results.length === 1 ? "product" : "products"}
          {query ? ` for “${query}”` : ""}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            aria-controls={`${idPrefix}-filters`}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-medium text-charcoal transition-colors hover:border-line-strong lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filters
          </button>

          <label htmlFor={fieldId("sort")} className="sr-only">
            Sort products
          </label>
          <select
            id={fieldId("sort")}
            value={sort}
            onChange={(event) => updateSort(event.target.value as CatalogSort)}
            className="h-11 rounded-lg border border-line bg-white px-4 text-sm text-charcoal focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15"
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        id={`${idPrefix}-filters`}
        className={`${filtersOpen ? "block" : "hidden"} lg:block`}
      >
        <div className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-5">
          {showSearch ? (
            <div className="sm:col-span-2 lg:col-span-1">
              <label
                htmlFor={fieldId("search")}
                className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted"
              >
                Search
              </label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted"
                  aria-hidden="true"
                />
                <Input
                  id={fieldId("search")}
                  type="search"
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Name, brand or category"
                  className="pl-9"
                />
              </div>
            </div>
          ) : null}

          <div>
            <label
              htmlFor={fieldId("category")}
              className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted"
            >
              Category
            </label>
            <select
              id={fieldId("category")}
              value={lockedCategory ?? category}
              onChange={(event) => updateCategory(event.target.value)}
              disabled={Boolean(lockedCategory)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-charcoal focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15 disabled:opacity-60"
            >
              <option value="">All categories</option>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={fieldId("brand")}
              className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted"
            >
              Brand
            </label>
            <select
              id={fieldId("brand")}
              value={lockedBrand ?? brand}
              onChange={(event) => updateBrand(event.target.value)}
              disabled={Boolean(lockedBrand)}
              className="h-11 w-full rounded-lg border border-line bg-white px-3 text-sm text-charcoal focus:border-emerald focus:outline-none focus:ring-2 focus:ring-emerald/15 disabled:opacity-60"
            >
              <option value="">All brands</option>
              {brands.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor={fieldId("min")}
                className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted"
              >
                Min ৳
              </label>
              <Input
                id={fieldId("min")}
                type="number"
                min={0}
                inputMode="numeric"
                value={minPrice}
                onChange={(event) => updateMinPrice(event.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label
                htmlFor={fieldId("max")}
                className="mb-2 block text-[11px] font-medium uppercase tracking-[0.14em] text-muted"
              >
                Max ৳
              </label>
              <Input
                id={fieldId("max")}
                type="number"
                min={0}
                inputMode="numeric"
                value={maxPrice}
                onChange={(event) => updateMaxPrice(event.target.value)}
                placeholder="Any"
              />
            </div>
          </div>

          <div className="flex flex-col justify-end gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(event) => updateAvailability(event.target.checked)}
                className="size-4 accent-[#046A38]"
              />
              In stock only
            </label>
            {hasFilters ? (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-emerald underline-offset-4 hover:underline"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Clear all filters
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <h2 className="sr-only">Products</h2>

      {results.length > 0 ? (
        <>
          <ProductGrid products={results.slice(0, visible)} />
          {visible < results.length ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((count) => count + pageSize)}
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Load more products
              </button>
            </div>
          ) : (
            <p className="mt-10 text-center text-xs text-muted">
              Showing all {results.length} products
            </p>
          )}
        </>
      ) : (
        <EmptyState
          icon={X}
          title="No products found"
          description="Try a different search term or clear a filter to see more of the collection."
          action={
            <button
              type="button"
              onClick={clearAll}
              className={buttonStyles({ variant: "primary", size: "md" })}
            >
              Clear filters
            </button>
          }
        />
      )}

      {results.length > 0 ? (
        <p className="mt-6 text-center text-[11px] text-muted">
          Prices shown in Bangladeshi Taka. Lowest displayed price:{" "}
          {formatPrice(
            Math.min(...results.map((product) => product.salePrice ?? product.regularPrice)),
          )}
        </p>
      ) : null}
    </div>
  );
}
