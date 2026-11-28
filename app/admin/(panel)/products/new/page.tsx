import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listAdminBrands, listAdminCategories } from "@/services/admin-taxonomy";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "New product",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  await guardAdminPage();
  const [brands, categories] = await Promise.all([
    listAdminBrands(),
    listAdminCategories(),
  ]);

  return (
    <>
      <Link
        href="/admin/products"
        className="mb-5 inline-flex items-center gap-2 text-sm text-ink-soft hover:text-leaf"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to products
      </Link>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="New product"
        description="Fill in the product details, then add images after it is created."
      />
      <ProductForm
        brands={brands
          .filter(({ isActive }) => isActive)
          .map(({ id, name }) => ({ id, name }))}
        categories={categories
          .filter(({ isActive }) => isActive)
          .map(({ id, name }) => ({ id, name }))}
      />
    </>
  );
}
