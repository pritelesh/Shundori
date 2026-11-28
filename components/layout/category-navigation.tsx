import Link from "next/link";

import type { CatalogCategory } from "@/types/product";
import { cn } from "@/utils/cn";

import { Container } from "./container";
import { Localized } from "./localized";

/** Presentation order for the storefront's headline departments. */
const featuredCategorySlugs = [
  "skincare",
  "makeup",
  "haircare",
  "body-care",
] as const;

export interface CategoryNavigationProps {
  categories: readonly CatalogCategory[];
  className?: string;
}

/**
 * Server-rendered department row. Category names and links come from the
 * catalogue service; static labels are localized in the client UI.
 */
export function CategoryNavigation({
  categories,
  className,
}: CategoryNavigationProps) {
  const featured = featuredCategorySlugs
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category): category is CatalogCategory => Boolean(category));

  const visibleCategories =
    featured.length > 0 ? featured : categories.slice(0, 4);

  return (
    <nav
      aria-label="Shop categories"
      className={cn("border-t border-sage-light/70 bg-mist", className)}
    >
      <Container className="flex h-12 items-center gap-5 overflow-x-auto whitespace-nowrap">
        {visibleCategories.map((category) => (
          <Link
            key={category.slug}
            href={`/category/${category.slug}`}
            className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium uppercase tracking-[0.08em] text-leaf transition-colors hover:text-forest"
          >
            {category.name}
          </Link>
        ))}
        <Link
          href="/shop?sort=price-desc"
          className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium uppercase tracking-[0.08em] text-leaf transition-colors hover:text-forest"
        >
          <Localized en="Offers" bn="অফার" />
        </Link>
      </Container>
    </nav>
  );
}
