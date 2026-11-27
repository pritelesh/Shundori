import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { CatalogFallback } from "@/components/catalog/catalog-fallback";
import { DemoNotice } from "@/components/catalog/demo-notice";
import { Container } from "@/components/layout/container";
import { pageMetadata } from "@/lib/seo";
import { PageHeader } from "@/components/layout/page-header";
import {
  isDemoCatalogue,
  listBrands,
  listCategories,
  listProducts,
} from "@/services/catalog";
import type { CatalogSort } from "@/types/product";

export async function generateMetadata(): Promise<Metadata> {
  const demo = isDemoCatalogue();
  return pageMetadata({
    title: "All Products",
    description: demo
      ? "Browse the full Shundori demonstration catalogue with category, brand, price and availability filters."
      : "Browse the full Shundori collection with category, brand, price and availability filters.",
    path: "/shop",
    noIndex: demo,
  });
}

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <>
      <PageHeader
        eyebrow="The collection"
        title="All products."
        description="Filter by category, brand, price and availability. Prices are shown in Bangladeshi Taka."
      />
      <Suspense fallback={<CatalogFallback />}>
        <ShopResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ShopResults({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await connection();

  const params = await searchParams;
  const query = firstValue(params.q) ?? "";
  const requestedSort = firstValue(params.sort) ?? "featured";
  const sort: CatalogSort =
    requestedSort === "newest" ||
    requestedSort === "price-asc" ||
    requestedSort === "price-desc" ||
    requestedSort === "name-asc"
      ? requestedSort
      : "featured";

  const [products, categories, brands] = await Promise.all([
    listProducts(),
    listCategories(),
    listBrands(),
  ]);

  return (
    <Container className="py-10 sm:py-14">
      <DemoNotice demo={isDemoCatalogue()} className="mb-8" />
      <CatalogBrowser
        key={`shop-${query}-${sort}`}
        products={products}
        categories={categories}
        brands={brands}
        initialFilters={{ query, sort }}
      />
    </Container>
  );
}
