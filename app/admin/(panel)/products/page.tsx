import { PackageSearch, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ProductRowActions } from "@/components/admin/product-row-actions";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  listAdminBrands,
  listAdminCategories,
} from "@/services/admin-taxonomy";
import { guardAdminPage } from "@/services/admin-page-guard";
import {
  listAdminProducts,
  type AdminProductFilters,
} from "@/services/admin-products";
import { getProductImageUrl } from "@/services/images";
import { formatDate, formatPrice } from "@/utils/format";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

function param(value: string | string[] | undefined): string {
  const entry = Array.isArray(value) ? value[0] : value;
  return entry?.trim() ?? "";
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await guardAdminPage();
  const params = await searchParams;
  const activeValue = param(params.active);
  const stockValue = param(params.stock);
  const sortValue = param(params.sort);
  const filters: AdminProductFilters = {
    query: param(params.q),
    brandId: param(params.brand),
    categoryId: param(params.category),
    active:
      activeValue === "active" || activeValue === "inactive"
        ? activeValue
        : "all",
    stock: ["in", "low", "out"].includes(stockValue)
      ? (stockValue as "in" | "low" | "out")
      : "all",
    sort: ["name", "stock", "price", "newest"].includes(sortValue)
      ? (sortValue as "newest" | "name" | "stock" | "price")
      : "newest",
  };

  const [products, brands, categories] = await Promise.all([
    listAdminProducts(filters),
    listAdminBrands(),
    listAdminCategories(),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Create, edit, publish and search every product in the store."
        actions={
          <Link href="/admin/products/new" className={buttonStyles()}>
            <Plus className="size-4" aria-hidden="true" />
            New product
          </Link>
        }
      />

      <form
        action="/admin/products"
        method="get"
        className="grid gap-3 surface-card rounded-2xl p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
      >
        <Input
          name="q"
          defaultValue={filters.query}
          placeholder="Search by name, SKU or description…"
          aria-label="Search products"
        />
        <select
          name="brand"
          defaultValue={filters.brandId}
          className="h-11 rounded-lg border border-sage-light bg-cream px-3 text-sm"
          aria-label="Filter by brand"
        >
          <option value="">All brands</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={filters.categoryId}
          className="h-11 rounded-lg border border-sage-light bg-cream px-3 text-sm"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          name="active"
          defaultValue={filters.active}
          className="h-11 rounded-lg border border-sage-light bg-cream px-3 text-sm"
          aria-label="Filter by status"
        >
          <option value="all">Any status</option>
          <option value="active">Published</option>
          <option value="inactive">Unpublished</option>
        </select>
        <select
          name="stock"
          defaultValue={filters.stock}
          className="h-11 rounded-lg border border-sage-light bg-cream px-3 text-sm"
          aria-label="Filter by stock"
        >
          <option value="all">Any stock</option>
          <option value="in">In stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </select>
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-11 flex-1 rounded-full bg-forest px-5 text-sm font-medium text-cream hover:bg-forest-soft hover:text-cream"
          >
            Filter
          </button>
          <Link
            href="/admin/products"
            className="h-11 rounded-full border border-sage-light px-4 text-sm font-medium hover:bg-mist"
          >
            Reset
          </Link>
        </div>
        <input type="hidden" name="sort" value={filters.sort} />
      </form>

      <div className="mt-5 flex items-center justify-between text-xs text-ink-soft">
        <p>{products.length} product(s) found</p>
        <p>Updated {formatDate(new Date().toISOString())}</p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={PackageSearch}
          title="No products found"
          description="Try a different search or create your first product."
          action={
            <Link href="/admin/products/new" className={buttonStyles()}>
              Create product
            </Link>
          }
        />
      ) : (
        <div className="mt-5 overflow-hidden surface-card rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-cream text-xs uppercase tracking-[0.08em] text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Brand / category</th>
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-light/70">
                {products.map((product) => {
                  const cover = product.imagePaths[0];
                  return (
                    <tr key={product.id} className="hover:bg-cream/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sage-light bg-cream">
                            {cover ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getProductImageUrl(cover)}
                                alt=""
                                className="size-full object-contain"
                              />
                            ) : (
                              <span className="font-display text-lg text-leaf">
                                {product.name.charAt(0)}
                              </span>
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{product.name}</p>
                            <p className="mt-0.5 text-xs text-ink-soft">
                              {product.sku || product.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <p>{product.brandName}</p>
                        <p className="mt-0.5 text-xs text-ink-soft">
                          {product.categoryName}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <p>{formatPrice(product.regularPrice)}</p>
                        {product.salePrice ? (
                          <p className="mt-0.5 text-xs text-leaf">
                            Sale {formatPrice(product.salePrice)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            product.stockQuantity === 0
                              ? "rounded-full bg-forest px-2.5 py-1 text-xs font-semibold text-cream"
                              : product.stockQuantity <= 5
                                ? "rounded-full bg-sage-light px-2.5 py-1 text-xs font-semibold text-forest"
                                : "text-ink-soft"
                          }
                        >
                          {product.stockQuantity}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={
                            product.isActive
                              ? "rounded-full bg-leaf px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cream"
                              : "rounded-full bg-sage-light px-3 py-1 text-xs font-semibold uppercase tracking-wide text-forest"
                          }
                        >
                          {product.isActive ? "Published" : "Draft"}
                        </span>
                        {product.isFeatured ? (
                          <span className="ml-2 rounded-full bg-lime px-3 py-1 text-xs font-semibold uppercase tracking-wide text-forest">
                            Featured
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3">
                        <ProductRowActions
                          id={product.id}
                          name={product.name}
                          isActive={product.isActive}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
