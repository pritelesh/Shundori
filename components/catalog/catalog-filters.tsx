"use client";

import { RotateCcw, Search } from "lucide-react";

import { buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogSort,
} from "@/types/product";
import { cn } from "@/utils/cn";

export const sortLabels: Record<CatalogSort, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  "name-asc": "Name: A to Z",
};

export interface CatalogFilterControlsProps {
  idPrefix: string;
  scope: string;
  categories: readonly CatalogCategory[];
  brands: readonly CatalogBrand[];
  query: string;
  category: string;
  brand: string;
  minPrice: string;
  maxPrice: string;
  inStockOnly: boolean;
  sort: CatalogSort;
  lockedCategory?: string;
  lockedBrand?: string;
  showSearch?: boolean;
  showSort?: boolean;
  canClear: boolean;
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onBrandChange: (value: string) => void;
  onMinPriceChange: (value: string) => void;
  onMaxPriceChange: (value: string) => void;
  onAvailabilityChange: (value: boolean) => void;
  onSortChange: (value: CatalogSort) => void;
  onClear: () => void;
}

export interface StockToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  showLabel?: boolean;
  className?: string;
}

/** Accessible switch shared by the listing toolbar and filter panels. */
export function StockToggle({
  checked,
  onChange,
  showLabel = true,
  className,
}: StockToggleProps) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center",
        showLabel ? "justify-between gap-3" : "gap-2",
        className,
      )}
    >
      {showLabel ? (
        <span className="text-sm text-ink-soft">In stock only</span>
      ) : null}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label="In stock only"
        onClick={() => onChange(!checked)}
        className={cn(
          "inline-flex h-11 w-14 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2",
          checked ? "bg-leaf" : "bg-forest-soft",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-9 rounded-full bg-cream shadow-soft transition-transform",
            checked && "translate-x-3",
          )}
        />
      </button>
    </div>
  );
}

/** Shared filter controls used by the desktop sidebar and mobile sheet. */
export function CatalogFilterControls({
  idPrefix,
  scope,
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
  showSearch = true,
  showSort = false,
  canClear,
  onQueryChange,
  onCategoryChange,
  onBrandChange,
  onMinPriceChange,
  onMaxPriceChange,
  onAvailabilityChange,
  onSortChange,
  onClear,
}: CatalogFilterControlsProps) {
  const fieldId = (name: string) => `${idPrefix}-${scope}-${name}`;

  return (
    <div className="space-y-5">
      {showSort ? (
        <div>
          <label
            htmlFor={fieldId("sort")}
            className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-ink-soft"
          >
            Sort by
          </label>
          <select
            id={fieldId("sort")}
            value={sort}
            onChange={(event) => onSortChange(event.target.value as CatalogSort)}
            className="h-11 w-full rounded-lg border border-sage-light bg-cream px-3 text-sm text-ink-soft focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15"
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {showSearch ? (
        <div>
          <label
            htmlFor={fieldId("search")}
            className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-ink-soft"
          >
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-ink-soft"
              aria-hidden="true"
            />
            <Input
              id={fieldId("search")}
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Name, brand or category"
              className="pl-9"
            />
          </div>
        </div>
      ) : null}

      <div>
        <label
          htmlFor={fieldId("category")}
          className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-ink-soft"
        >
          Category
        </label>
        <select
          id={fieldId("category")}
          value={lockedCategory ?? category}
          onChange={(event) => onCategoryChange(event.target.value)}
          disabled={Boolean(lockedCategory)}
          className="h-11 w-full rounded-lg border border-sage-light bg-cream px-3 text-sm text-ink-soft focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15 disabled:opacity-60"
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
          className="mb-2 block text-xs font-medium uppercase tracking-[0.08em] text-ink-soft"
        >
          Brand
        </label>
        <select
          id={fieldId("brand")}
          value={lockedBrand ?? brand}
          onChange={(event) => onBrandChange(event.target.value)}
          disabled={Boolean(lockedBrand)}
          className="h-11 w-full rounded-lg border border-sage-light bg-cream px-3 text-sm text-ink-soft focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15 disabled:opacity-60"
        >
          <option value="">All brands</option>
          {brands.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="mb-2 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
          Price range
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor={fieldId("min")} className="sr-only">
              Minimum price in Taka
            </label>
            <Input
              id={fieldId("min")}
              type="number"
              min={0}
              inputMode="numeric"
              value={minPrice}
              onChange={(event) => onMinPriceChange(event.target.value)}
              placeholder="Min ৳"
            />
          </div>
          <div>
            <label htmlFor={fieldId("max")} className="sr-only">
              Maximum price in Taka
            </label>
            <Input
              id={fieldId("max")}
              type="number"
              min={0}
              inputMode="numeric"
              value={maxPrice}
              onChange={(event) => onMaxPriceChange(event.target.value)}
              placeholder="Max ৳"
            />
          </div>
        </div>
      </fieldset>

      <div className="flex min-h-11 items-center justify-between gap-3 border-t border-sage-light pt-4">
        <span className="text-sm text-ink-soft">In stock only</span>
        <button
          type="button"
          role="switch"
          aria-checked={inStockOnly}
          aria-label="In stock only"
          onClick={() => onAvailabilityChange(!inStockOnly)}
          className={cn(
            "inline-flex h-11 w-14 shrink-0 items-center rounded-full p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 focus-visible:ring-offset-2",
            inStockOnly ? "bg-leaf" : "bg-forest-soft",
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "size-9 rounded-full bg-cream shadow-soft transition-transform",
              inStockOnly && "translate-x-3",
            )}
          />
        </button>
      </div>

      {canClear ? (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            buttonStyles({ variant: "ghost", size: "md" }),
            "w-full gap-2 text-leaf",
          )}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Clear all filters
        </button>
      ) : null}
    </div>
  );
}
