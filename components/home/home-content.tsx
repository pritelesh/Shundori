import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProduct,
} from "@/types/product";
import type { StoreSettings } from "@/types/phase8";

import { HomeBestSellers } from "./home-best-sellers";
import { HomeBrands } from "./home-brands";
import { HomeCategories } from "./home-categories";
import { Hero } from "./hero";
import { HomeNewArrivals } from "./home-new-arrivals";
import { HomeOffers } from "./home-offers";
import { HomeTrustRow } from "./home-trust-row";

export interface HomeContentProps {
  categories: readonly CatalogCategory[];
  categoryCounts: readonly number[];
  brands: readonly CatalogBrand[];
  brandCounts: readonly number[];
  products: readonly CatalogProduct[];
  newArrivals: readonly CatalogProduct[];
  offerProducts: readonly CatalogProduct[];
  settings: StoreSettings;
  demo: boolean;
}

/** Presentational composition of the storefront home page, in display order. */
export function HomeContent({
  categories,
  categoryCounts,
  brands,
  brandCounts,
  products,
  newArrivals,
  offerProducts,
  settings,
  demo,
}: HomeContentProps) {
  return (
    <div>
      <Hero settings={settings} />
      <HomeTrustRow settings={settings} />
      <HomeCategories categories={categories} counts={categoryCounts} />
      <HomeOffers products={offerProducts} />
      <HomeBestSellers products={products} demo={demo} />
      <HomeBrands brands={brands} counts={brandCounts} demo={demo} />
      <HomeNewArrivals products={newArrivals} demo={demo} />
    </div>
  );
}
