"use client";

import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { CatalogFilterControls, sortLabels, StockToggle } from "@/components/catalog/catalog-filters";
import { ProductGrid } from "@/components/catalog/product-grid";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { currentPrice, filterProducts, sortProducts } from "@/lib/catalog-filter";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogFilters,
  CatalogProduct,
  CatalogSort,
} from "@/types/product";
import { cn } from "@/utils/cn";
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

interface ActiveChip {
  key: string;
  label: string;
  onRemove: () => void;
}

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
  // Availability is opt-out: sold-out products are hidden until the shopper
  // deliberately includes them, and sortProducts always trails them anyway.
  const [inStockOnly, setInStockOnly] = useState(
    initialFilters.availability !== "all",
  );
  const [sort, setSort] = useState<CatalogSort>(initialFilters.sort ?? "featured");
  const [visible, setVisible] = useState(pageSize);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);
  const loadTimer = useRef<number | null>(null);

  useEffect(() => {
    const dialog = sheetRef.current;
    if (!dialog) return;

    if (sheetOpen && !dialog.open) {
      dialog.showModal();
    } else if (!sheetOpen && dialog.open) {
      dialog.close();
    }
  }, [sheetOpen]);

  useEffect(() => {
    const dialog = sheetRef.current;
    if (!dialog) return;

    const handleClose = () => setSheetOpen(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setSheetOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(
    () => () => {
      if (loadTimer.current !== null) window.clearTimeout(loadTimer.current);
    },
    [],
  );

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
    setInStockOnly(true);
    setSort(initialFilters.sort ?? "featured");
    resetVisible();
  };

  const categoryName = categories.find((item) => item.slug === category)?.name;
  const brandName = brands.find((item) => item.slug === brand)?.name;

  const activeChips: ActiveChip[] = [];
  if (query.trim()) {
    activeChips.push({
      key: "query",
      label: `“${query.trim()}”`,
      onRemove: () => updateQuery(""),
    });
  }
  if (category && !lockedCategory) {
    activeChips.push({
      key: "category",
      label: categoryName ?? category,
      onRemove: () => updateCategory(""),
    });
  }
  if (brand && !lockedBrand) {
    activeChips.push({
      key: "brand",
      label: brandName ?? brand,
      onRemove: () => updateBrand(""),
    });
  }
  if (minPrice) {
    activeChips.push({
      key: "min",
      label: `Min ৳${minPrice}`,
      onRemove: () => updateMinPrice(""),
    });
  }
  if (maxPrice) {
    activeChips.push({
      key: "max",
      label: `Max ৳${maxPrice}`,
      onRemove: () => updateMaxPrice(""),
    });
  }
  if (inStockOnly) {
    activeChips.push({
      key: "stock",
      label: "In stock only",
      onRemove: () => updateAvailability(false),
    });
  }

  const countLabel = `${results.length} ${results.length === 1 ? "product" : "products"}`;

  const sortSelect = (
    <>
      <label htmlFor={`${idPrefix}-sort`} className="sr-only">
        Sort products
      </label>
      <select
        id={`${idPrefix}-sort`}
        value={sort}
        onChange={(event) => updateSort(event.target.value as CatalogSort)}
        className="h-11 rounded-lg border border-sage-light bg-cream px-4 text-sm text-ink-soft focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15"
      >
        {Object.entries(sortLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </>
  );

  const filterProps = {
    idPrefix,
    categories,
    brands,
    query,
    category,
    brand,
    minPrice,
    maxPrice,
    inStockOnly,
    sort,
    lockedCategory,
    lockedBrand,
    showSearch,
    canClear: activeChips.length > 0,
    onQueryChange: updateQuery,
    onCategoryChange: updateCategory,
    onBrandChange: updateBrand,
    onMinPriceChange: updateMinPrice,
    onMaxPriceChange: updateMaxPrice,
    onAvailabilityChange: updateAvailability,
    onSortChange: updateSort,
    onClear: clearAll,
  };

  const loadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    loadTimer.current = window.setTimeout(() => {
      setVisible((count) => count + pageSize);
      setLoadingMore(false);
      loadTimer.current = null;
    }, 320);
  };

  return (
    <div>
      {/* Mobile: compact sticky bar opens the full filter sheet. */}
      <div className="sticky top-16 z-20 mb-4 flex min-h-14 items-center justify-between gap-3 rounded-xl border border-sage-light bg-mist px-3 py-2 shadow-soft lg:hidden">
        <p className="text-sm text-ink-soft" aria-live="polite">
          <span className="font-semibold text-ink-soft">{results.length}</span>{" "}
          {results.length === 1 ? "product" : "products"}
        </p>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-expanded={sheetOpen}
          className={buttonStyles({ variant: "outline", size: "md" })}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filter &amp; Sort
          {activeChips.length > 0 ? (
            <span className="flex min-w-5 items-center justify-center rounded-full bg-sage-light px-1 text-xs font-semibold leading-5 text-forest">
              {activeChips.length}
            </span>
          ) : null}
        </button>
      </div>

      {/* Desktop: left sidebar plus a result/sort toolbar. */}
      <div className="hidden grid-cols-[15rem_minmax(0,1fr)] gap-8 lg:grid">
        <aside
          aria-label="Product filters"
          className="lg:sticky lg:top-32 lg:self-start lg:border-r lg:border-sage-light lg:pr-6"
        >
          <h2 className="font-display text-xl text-forest">Filters</h2>
          <div className="mt-4">
            <CatalogFilterControls {...filterProps} scope="sidebar" />
          </div>
        </aside>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sage-light pb-5">
            <p className="text-sm text-ink-soft" aria-live="polite">
              <span className="font-semibold text-ink-soft">{results.length}</span>{" "}
              {results.length === 1 ? "product" : "products"}
              {query.trim() ? ` for “${query.trim()}”` : ""}
            </p>
            <div className="flex items-center gap-4">
              <StockToggle checked={inStockOnly} onChange={updateAvailability} />
              {sortSelect}
            </div>
          </div>

          {activeChips.length > 0 ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove filter: ${chip.label}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-sage-light bg-cream px-3 text-sm text-ink-soft transition-colors hover:border-sage"
                >
                  {chip.label}
                  <X className="size-3.5 text-ink-soft" aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={clearAll}
                className={cn(
                  buttonStyles({ variant: "ghost", size: "md" }),
                  "gap-1.5 text-leaf",
                )}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile: chips stay visible above the grid after the sheet closes. */}
      {activeChips.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2 lg:hidden">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              aria-label={`Remove filter: ${chip.label}`}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-sage-light bg-cream px-3 text-sm text-ink-soft"
            >
              {chip.label}
              <X className="size-3.5 text-ink-soft" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-leaf underline-offset-4 hover:underline"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Clear all
          </button>
        </div>
      ) : null}

      <h2 className="sr-only">Products</h2>

      {results.length > 0 ? (
        <>
          <ProductGrid
            products={results.slice(0, visible)}
            skeletonCount={loadingMore ? Math.min(pageSize, results.length - visible) : 0}
          />
          {visible < results.length ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                {loadingMore ? "Loading…" : "Load more products"}
              </button>
            </div>
          ) : (
            <p className="mt-10 text-center text-xs text-ink-soft">
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
        <p className="mt-6 text-center text-xs text-ink-soft">
          Prices shown in Bangladeshi Taka. Lowest displayed price:{" "}
          {formatPrice(Math.min(...results.map((product) => currentPrice(product))))}
        </p>
      ) : null}

      {/* Mobile bottom sheet. Native <dialog> supplies focus trap, Escape and
          scroll locking; only the slide-up presentation is custom. */}
      <dialog
        ref={sheetRef}
        aria-labelledby={`${idPrefix}-sheet-title`}
        data-sheet="true"
        className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[88dvh] w-full max-w-none overflow-hidden rounded-t-2xl border-0 bg-cream p-0 text-ink-soft shadow-soft lg:hidden"
        onClick={(event) => {
          if (event.target === event.currentTarget) setSheetOpen(false);
        }}
      >
        <div className="flex h-full max-h-[88dvh] flex-col">
          <div className="flex items-center justify-between gap-4 border-b border-sage-light px-5 py-4">
            <div>
              <h2 id={`${idPrefix}-sheet-title`} className="font-display text-2xl">
                Filter &amp; Sort
              </h2>
              <p className="mt-0.5 text-sm text-ink-soft">{countLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              aria-label="Close filters"
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-mist hover:text-ink-soft"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5">
            <CatalogFilterControls
              {...filterProps}
              scope="sheet"
              showSort
              showSearch={showSearch}
            />
          </div>

          <div className="border-t border-sage-light px-5 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}
            >
              Show {countLabel}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
