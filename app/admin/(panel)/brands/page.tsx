import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listAdminBrands } from "@/services/admin-taxonomy";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Brands",
  robots: { index: false, follow: false },
};

export default async function AdminBrandsPage() {
  await guardAdminPage();
  const brands = await listAdminBrands();

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Brands"
        description="Add brands, upload logos and control which brands appear on the storefront."
      />
      <TaxonomyManager
        kind="brands"
        items={brands.map((brand) => ({
          id: brand.id,
          name: brand.name,
          description: brand.description,
          imageUrl: brand.logoUrl,
          isActive: brand.isActive,
          productCount: brand.productCount,
        }))}
      />
    </>
  );
}
