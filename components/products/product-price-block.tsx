import { DiscountBadge } from "@/components/products/discount-badge";
import { PriceDisplay } from "@/components/products/price-display";
import { effectiveCompareAtPrice, effectivePrice } from "@/lib/offer-pricing";
import type { CatalogProduct } from "@/types/product";
import { formatPrice } from "@/utils/format";

export interface ProductPriceBlockProps {
  product: CatalogProduct;
}

/** Current price, compare-at, discount badge and the actual money saved. */
export function ProductPriceBlock({ product }: ProductPriceBlockProps) {
  const price = effectivePrice(product);
  const compareAtPrice = effectiveCompareAtPrice(product);
  const saving = compareAtPrice !== null ? compareAtPrice - price : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <PriceDisplay price={price} compareAtPrice={compareAtPrice} size="lg" />
        <DiscountBadge price={price} compareAtPrice={compareAtPrice} />
      </div>
      {saving > 0 ? (
        <p className="mt-2 text-sm font-medium text-leaf">
          Save {formatPrice(saving)} on this item.
        </p>
      ) : null}
    </div>
  );
}
