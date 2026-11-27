import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listAdminCategories } from "@/services/admin-taxonomy";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Categories",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage() {
  await guardAdminPage();
  const categories = await listAdminCategories();

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Categories"
        description="Organise products, upload category artwork and set parent categories."
      />
      <TaxonomyManager
        kind="categories"
        items={categories.map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
          isActive: category.isActive,
          productCount: category.productCount,
          parentId: category.parentId,
        }))}
      />
    </>
  );
}
