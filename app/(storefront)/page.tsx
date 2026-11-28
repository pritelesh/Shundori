import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { HomeContent } from "@/components/home/home-content";
import { HomeFallback } from "@/components/home/home-fallback";
import { pageMetadata } from "@/lib/seo";
import { getPublicStoreSettings } from "@/services/business-settings";
import {
  countProductsByBrand,
  countProductsByCategory,
  getFeaturedProducts,
  getNewArrivals,
  isDemoCatalogue,
  listBrands,
  listCategories,
  listProducts,
} from "@/services/catalog";

export async function generateMetadata(): Promise<Metadata> {
  const demo = isDemoCatalogue();
  return pageMetadata({
    title: "Beauty essentials, delivered",
    description:
      "Skincare, makeup and haircare. Prices in BDT, islandwide delivery and cash on delivery.",
    path: "/",
    noIndex: demo,
  });
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeData />
    </Suspense>
  );
}

async function HomeData() {
  // Offer prices are time-dependent and live catalogue reads must not depend
  // on build-time database availability. Defer the whole subtree to request
  // time; query failures still surface through app/error.tsx.
  await connection();

  const [categories, brands, bestSellers, newArrivals, allProducts, settings] =
    await Promise.all([
      listCategories(),
      listBrands(),
      getFeaturedProducts(8),
      getNewArrivals(4),
      listProducts(),
      getPublicStoreSettings(),
    ]);
  const [categoryCounts, brandCounts] = await Promise.all([
    Promise.all(
      categories.map((category) => countProductsByCategory(category.slug)),
    ),
    Promise.all(brands.map((brand) => countProductsByBrand(brand.slug))),
  ]);

  return (
    <HomeContent
      categories={categories}
      categoryCounts={categoryCounts}
      brands={brands}
      brandCounts={brandCounts}
      products={bestSellers}
      newArrivals={newArrivals}
      offerProducts={allProducts}
      settings={settings}
      demo={isDemoCatalogue()}
    />
  );
}
