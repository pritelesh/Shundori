import { ArrowLeft, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ProductForm } from "@/components/admin/product-form";
import { ProductImageManager } from "@/components/admin/product-image-manager";
import { assertUuid } from "@/lib/admin-validation";
import { guardAdminPage } from "@/services/admin-page-guard";
import { getAdminProduct } from "@/services/admin-products";
import { listAdminBrands, listAdminCategories } from "@/services/admin-taxonomy";
import { getProductImageUrl } from "@/services/images";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardAdminPage();
  const { id } = await params;
  assertUuid(id);

  const [product, brands, categories] = await Promise.all([
    getAdminProduct(id),
    listAdminBrands(),
    listAdminCategories(),
  ]);

  if (!product) notFound();

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
        title={`Edit ${product.name}`}
        description={`Slug: ${product.slug}`}
        actions={
          product.isActive ? (
            <Link
              href={`/product/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-sage-light px-5 py-2.5 text-sm font-medium hover:bg-cream"
            >
              View live
              <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-7">
        <ProductImageManager
          key={product.imagePaths.join("|")}
          productId={product.id}
          initialImages={product.imagePaths.map((path) => ({
            path,
            url: getProductImageUrl(path),
          }))}
        />
        <ProductForm
          product={product}
          brands={brands.map(({ id: brandId, name, isActive }) => ({
            id: brandId,
            name: isActive ? name : `${name} (inactive)`,
          }))}
          categories={categories.map(({ id: categoryId, name, isActive }) => ({
            id: categoryId,
            name: isActive ? name : `${name} (inactive)`,
          }))}
        />
      </div>
    </>
  );
}
