/**
 * Shared, authoritative offer-window rule used by storefront rendering and
 * checkout quotes. The database applies the same rule in
 * `public.effective_product_price()` when a COD order is placed, so a customer
 * can never buy at a price that is only displayed in the browser.
 */
export interface OfferPricingFields {
  regularPrice: number;
  salePrice: number | null;
  saleStartsAt?: string | null;
  saleEndsAt?: string | null;
}

/** Raw database row shape; accepted so checkout quotes use the same rule. */
export interface OfferPricingRowFields {
  regular_price: number;
  sale_price: number | null;
  sale_starts_at?: string | null;
  sale_ends_at?: string | null;
}

export type OfferPricingSource = OfferPricingFields | OfferPricingRowFields;

function fields(product: OfferPricingSource): OfferPricingFields {
  if ("regularPrice" in product) return product;
  return {
    regularPrice: product.regular_price,
    salePrice: product.sale_price,
    saleStartsAt: product.sale_starts_at,
    saleEndsAt: product.sale_ends_at,
  };
}

function timestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isOfferActive(
  source: OfferPricingSource,
  now: Date = new Date(),
): boolean {
  const product = fields(source);
  if (product.salePrice === null || product.salePrice === undefined) return false;

  const current = now.getTime();
  const starts = timestamp(product.saleStartsAt);
  const ends = timestamp(product.saleEndsAt);

  if (starts !== null && current < starts) return false;
  if (ends !== null && current >= ends) return false;
  return true;
}

export function effectivePrice(
  source: OfferPricingSource,
  now: Date = new Date(),
): number {
  const product = fields(source);
  return isOfferActive(product, now)
    ? (product.salePrice as number)
    : product.regularPrice;
}

/** Compare-at price is exposed only while a sale is actually active. */
export function effectiveCompareAtPrice(
  source: OfferPricingSource,
  now: Date = new Date(),
): number | null {
  const product = fields(source);
  return isOfferActive(product, now) ? product.regularPrice : null;
}

export function offerDiscountPercentage(
  source: OfferPricingSource,
  now: Date = new Date(),
): number {
  const product = fields(source);
  if (!isOfferActive(product, now) || product.regularPrice <= 0) return 0;

  const percentage = Math.floor(
    ((product.regularPrice - (product.salePrice as number)) * 100) /
      product.regularPrice,
  );
  return Math.min(100, Math.max(0, percentage));
}
