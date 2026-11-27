import { X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { CatalogFallback } from "@/components/catalog/catalog-fallback";
import { DemoNotice } from "@/components/catalog/demo-notice";
import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { buttonStyles } from "@/components/ui/button";
import {
  isDemoCatalogue,
  listBrands,
  listCategories,
  listProducts,
} from "@/services/catalog";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Search Products",
    description: isDemoCatalogue()
      ? "Search the Shundori demonstration catalogue by product, brand or category."
      : "Search the Shundori collection by product, brand or category.",
  };
}

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Search"
        title="Find your next favourite."
        description="Search by product name, brand or category, then refine the results below."
      />
      <Suspense fallback={<CatalogFallback />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function SearchResults({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();

  const params = await searchParams;
  const rawQuery = params.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";

  const [products, categories, brands] = await Promise.all([
    listProducts({ query }),
    listCategories(),
    listBrands(),
  ]);

  return (
    <Container className="py-10 sm:py-14">
      <DemoNotice demo={isDemoCatalogue()} className="mb-8" />

      {query ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warm-line bg-warm-white px-4 py-3">
          <p className="text-sm text-taupe">
            Results for <span className="font-medium text-dark-text">“{query}”</span>
          </p>
          <Link href="/search" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            <X className="size-4" aria-hidden="true" />
            Clear search
          </Link>
        </div>
      ) : null}

      <CatalogBrowser
        key={`search-${query}`}
        products={products}
        categories={categories}
        brands={brands}
        initialFilters={{ query }}
      />
    </Container>
  );
}
