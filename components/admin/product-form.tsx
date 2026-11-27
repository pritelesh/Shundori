"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  createProductAction,
  updateProductAction,
} from "@/app/admin/(panel)/actions";
import { initialMutationState } from "@/app/admin/(panel)/mutation-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { AdminProduct } from "@/services/admin-products";

interface Option {
  id: string;
  name: string;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-chocolate">{message}</p>;
}

const textareaClass =
  "w-full rounded-lg border border-warm-line bg-warm-white px-4 py-3 text-sm text-dark-text placeholder:text-taupe/70 transition-colors focus:border-olive-deep focus:outline-none focus:ring-2 focus:ring-olive-deep/15";

export function ProductForm({
  product,
  brands,
  categories,
}: {
  product?: AdminProduct;
  brands: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const action = product
    ? updateProductAction.bind(null, product.id)
    : createProductAction;
  const [state, formAction, pending] = useActionState(
    action,
    initialMutationState,
  );

  useEffect(() => {
    if (state.status === "error" && state.message) {
      toast({ title: "Could not save product", description: state.message, variant: "promo" });
    }
    if (state.status === "success") {
      toast({ title: "Saved", description: state.message, variant: "success" });
      if (state.productId && !product) {
        router.push(`/admin/products/${state.productId}/edit`);
      } else {
        router.refresh();
      }
    }
  }, [state, toast, router, product]);

  const regularPrice = product ? (product.regularPrice / 100).toFixed(2) : "";
  const salePrice = product?.salePrice ? (product.salePrice / 100).toFixed(2) : "";

  // Admin inputs are Asia/Dhaka wall-clock times; readDateTime() applies the
  // same offset when the form is submitted.
  const dateTimeLocal = (value: string | null | undefined): string => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Date(date.getTime() + 6 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 16);
  };

  return (
    <form action={formAction} className="space-y-7">
      <section className="rounded-2xl border border-warm-line bg-warm-white p-6">
        <h2 className="font-display text-xl">Product details</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="name" className="mb-2 block text-sm font-medium">
              Product name *
            </label>
            <Input
              id="name"
              name="name"
              required
              maxLength={160}
              defaultValue={product?.name}
              placeholder="e.g. Hydrating Vitamin C Serum"
              aria-invalid={Boolean(state.fieldErrors.name)}
            />
            <FieldError message={state.fieldErrors.name} />
          </div>

          <div>
            <label htmlFor="sku" className="mb-2 block text-sm font-medium">
              SKU
            </label>
            <Input
              id="sku"
              name="sku"
              maxLength={80}
              defaultValue={product?.sku ?? ""}
              placeholder="SD-VC-030"
              aria-invalid={Boolean(state.fieldErrors.sku)}
            />
            <FieldError message={state.fieldErrors.sku} />
          </div>

          <div>
            <label htmlFor="brandId" className="mb-2 block text-sm font-medium">
              Brand *
            </label>
            <select
              id="brandId"
              name="brandId"
              required
              defaultValue={product?.brandId ?? brands[0]?.id ?? ""}
              className={textareaClass}
            >
              <option value="">Choose a brand</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors.brandId} />
          </div>

          <div>
            <label
              htmlFor="categoryId"
              className="mb-2 block text-sm font-medium"
            >
              Category
            </label>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={product?.categoryId ?? ""}
              className={textareaClass}
            >
              <option value="">Uncategorised</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <FieldError message={state.fieldErrors.categoryId} />
          </div>

          <div>
            <label
              htmlFor="regularPrice"
              className="mb-2 block text-sm font-medium"
            >
              Regular price (BDT) *
            </label>
            <Input
              id="regularPrice"
              name="regularPrice"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={regularPrice}
              placeholder="499.00"
              aria-invalid={Boolean(state.fieldErrors.regularPrice)}
            />
            <FieldError message={state.fieldErrors.regularPrice} />
          </div>

          <div>
            <label htmlFor="salePrice" className="mb-2 block text-sm font-medium">
              Sale price (BDT)
            </label>
            <Input
              id="salePrice"
              name="salePrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={salePrice}
              placeholder="399.00"
              aria-invalid={Boolean(state.fieldErrors.salePrice)}
            />
            <FieldError message={state.fieldErrors.salePrice} />
          </div>

          <div>
            <label htmlFor="discountPercentage" className="mb-2 block text-sm font-medium">
              Discount percentage
            </label>
            <div
              id="discountPercentage"
              className="rounded-lg border border-warm-line bg-peach/40 px-4 py-3 text-sm text-dark-text"
            >
              {product?.discountPercentage ?? 0}% (
              {product?.salePrice
                ? ((product.regularPrice - product.salePrice) / 100).toFixed(2)
                : "0.00"}{" "}
              BDT off)
            </div>
            <p className="mt-1.5 text-xs text-taupe">
              Derived from regular and sale price by the database.
            </p>
          </div>

          <div>
            <label htmlFor="saleStartsAt" className="mb-2 block text-sm font-medium">
              Offer starts at
            </label>
            <Input
              id="saleStartsAt"
              name="saleStartsAt"
              type="datetime-local"
              defaultValue={dateTimeLocal(product?.saleStartsAt)}
              aria-invalid={Boolean(state.fieldErrors.saleStartsAt)}
            />
            <FieldError message={state.fieldErrors.saleStartsAt} />
          </div>

          <div>
            <label htmlFor="saleEndsAt" className="mb-2 block text-sm font-medium">
              Offer ends at
            </label>
            <Input
              id="saleEndsAt"
              name="saleEndsAt"
              type="datetime-local"
              defaultValue={dateTimeLocal(product?.saleEndsAt)}
              aria-invalid={Boolean(state.fieldErrors.saleEndsAt)}
            />
            <FieldError message={state.fieldErrors.saleEndsAt} />
            <p className="mt-1.5 text-xs text-taupe">
              Leave both blank for a sale with no expiry.
            </p>
          </div>

          <div>
            <label
              htmlFor="stockQuantity"
              className="mb-2 block text-sm font-medium"
            >
              Stock quantity *
            </label>
            <Input
              id="stockQuantity"
              name="stockQuantity"
              type="number"
              min="0"
              step="1"
              required
              defaultValue={product?.stockQuantity ?? 0}
              aria-invalid={Boolean(state.fieldErrors.stockQuantity)}
            />
            <FieldError message={state.fieldErrors.stockQuantity} />
          </div>

          <div>
            <label
              htmlFor="lowStockThreshold"
              className="mb-2 block text-sm font-medium"
            >
              Low-stock alert threshold
            </label>
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              min="0"
              step="1"
              defaultValue={product?.lowStockThreshold ?? 5}
              aria-invalid={Boolean(state.fieldErrors.lowStockThreshold)}
            />
            <FieldError message={state.fieldErrors.lowStockThreshold} />
          </div>

          <div>
            <label htmlFor="expiryDate" className="mb-2 block text-sm font-medium">
              Expiry date
            </label>
            <Input
              id="expiryDate"
              name="expiryDate"
              type="date"
              defaultValue={product?.expiryDate ?? ""}
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="shortDescription"
              className="mb-2 block text-sm font-medium"
            >
              Short description
            </label>
            <Input
              id="shortDescription"
              name="shortDescription"
              maxLength={240}
              defaultValue={product?.shortDescription ?? ""}
              placeholder="One-line summary for product cards"
              aria-invalid={Boolean(state.fieldErrors.shortDescription)}
            />
            <FieldError message={state.fieldErrors.shortDescription} />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium"
            >
              Full description
            </label>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={product?.description ?? ""}
              placeholder="Describe the product, its texture and results…"
              className={textareaClass}
              aria-invalid={Boolean(state.fieldErrors.description)}
            />
            <FieldError message={state.fieldErrors.description} />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-warm-line bg-warm-white p-6">
        <h2 className="font-display text-xl">Product information</h2>
        <p className="mt-1 text-xs text-taupe">
          Enter one item per line. Commas are also accepted.
        </p>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div>
            <label htmlFor="ingredients" className="mb-2 block text-sm font-medium">
              Ingredients
            </label>
            <textarea
              id="ingredients"
              name="ingredients"
              rows={6}
              defaultValue={product?.ingredients.join("\n") ?? ""}
              placeholder={"Aqua\nGlycerin\nNiacinamide"}
              className={textareaClass}
            />
          </div>
          <div>
            <label htmlFor="benefits" className="mb-2 block text-sm font-medium">
              Benefits
            </label>
            <textarea
              id="benefits"
              name="benefits"
              rows={6}
              defaultValue={product?.benefits.join("\n") ?? ""}
              placeholder={"Deep hydration\nBrightens skin"}
              className={textareaClass}
            />
          </div>
          <div>
            <label
              htmlFor="usageInstructions"
              className="mb-2 block text-sm font-medium"
            >
              How to use
            </label>
            <textarea
              id="usageInstructions"
              name="usageInstructions"
              rows={6}
              defaultValue={product?.usageInstructions.join("\n") ?? ""}
              placeholder={"Apply to clean skin\nUse morning and night"}
              className={textareaClass}
            />
          </div>
        </div>
        <FieldError message={state.fieldErrors.lists} />
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-warm-line bg-warm-white p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={product?.isActive ?? true}
              className="size-4 accent-olive-deep"
            />
            Published on the storefront
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={product?.isFeatured ?? false}
              className="size-4 accent-chocolate"
            />
            Feature this product
          </label>
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          <Save className="size-4" aria-hidden="true" />
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
      </section>
    </form>
  );
}
