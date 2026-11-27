import { ArrowRight, Check, ChevronRight, Clock3, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { DemoNotice } from "@/components/catalog/demo-notice";
import { ProductGrid } from "@/components/catalog/product-grid";
import { PurchaseControls } from "@/components/catalog/purchase-controls";
import { Container } from "@/components/layout/container";
import { DiscountBadge } from "@/components/products/discount-badge";
import { PriceDisplay } from "@/components/products/price-display";
import { ProductEnquiry } from "@/components/products/product-enquiry";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductRating } from "@/components/products/product-rating";
import { ProductReviewList } from "@/components/products/product-review-list";
import { ProductWhatsappButton } from "@/components/products/product-whatsapp-button";
import { ReviewForm } from "@/components/products/review-form";
import { Badge } from "@/components/ui/badge";
import { currentPrice } from "@/lib/catalog-filter";
import { effectiveCompareAtPrice } from "@/lib/offer-pricing";
import {
  jsonLdScript,
  productJsonLd,
  productMetadata,
} from "@/lib/seo";
import {
  getProductBySlug,
  getRelatedProducts,
  isDemoCatalogue,
  listProducts,
  safeStaticParams,
  STATIC_PARAM_PLACEHOLDER,
} from "@/services/catalog";
import { getApprovedReviews } from "@/services/reviews";
import type { CartProduct } from "@/types/cart";
import { formatDate, formatPrice } from "@/utils/format";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (slug === STATIC_PARAM_PLACEHOLDER) return { title: "Product not found" };

  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Product not found" };
  }

  const metadata = productMetadata(product);
  return isDemoCatalogue()
    ? { ...metadata, robots: { index: false, follow: false } }
    : metadata;
}

export async function generateStaticParams() {
  return safeStaticParams(() => listProducts());
}

export default function ProductPage(props: PageProps) {
  return (
    <Suspense fallback={<Container className="py-16"><p className="text-sm text-muted">Loading product…</p></Container>}>
      <ProductContent {...props} />
    </Suspense>
  );
}

async function ProductContent({ params }: PageProps) {
  // Offer prices are time-dependent. Defer this subtree to request time so
  // prerendering never captures a stale `new Date()` value.
  await connection();

  const { slug } = await params;
  if (slug === STATIC_PARAM_PLACEHOLDER) notFound();

  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 4);
  const demo = isDemoCatalogue();
  const reviews = demo ? [] : await getApprovedReviews(product.id);
  const cartProduct: CartProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandName: product.brand,
    price: currentPrice(product),
    imageUrl: product.images[0]?.url ?? null,
    visual: product.visual,
    tone: product.tone,
    stockQuantity: product.stockQuantity,
  };

  const stockLabel =
    product.stockQuantity > 0
      ? product.stockQuantity <= (product.lowStockThreshold ?? 5)
        ? `Low stock · ${product.stockQuantity} left`
        : "In stock"
      : "Out of stock";

  return (
    <div className="py-8 sm:py-12">
      {!demo ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product)) }}
        />
      ) : null}
      <Container>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted">
          <Link href="/" className="hover:text-charcoal hover:underline">Home</Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <Link href="/shop" className="hover:text-charcoal hover:underline">Shop</Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <Link
            href={`/category/${product.categorySlug}`}
            className="hover:text-charcoal hover:underline"
          >
            {product.category}
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="text-charcoal">{product.name}</span>
        </nav>

        <DemoNotice demo={demo} className="mt-6" />

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images} name={product.name} />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/brand/${product.brandSlug}`}
                className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald underline-offset-4 hover:underline"
              >
                {product.brand}
              </Link>
              <Badge variant="neutral">{product.category}</Badge>
              {product.isFeatured ? <Badge variant="pinkSoft">Featured</Badge> : null}
            </div>

            <h1 className="mt-4 font-display text-3xl leading-tight text-charcoal sm:text-4xl">
              {product.name}
            </h1>

            {product.rating !== null ? (
              <ProductRating rating={product.rating} reviewCount={product.reviewCount} className="mt-3" />
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <PriceDisplay
                price={currentPrice(product)}
                compareAtPrice={effectiveCompareAtPrice(product)}
                size="lg"
              />
              <DiscountBadge
                price={currentPrice(product)}
                compareAtPrice={effectiveCompareAtPrice(product)}
              />
            </div>

            <p className="mt-4 flex items-center gap-2 text-sm text-muted">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${product.stockQuantity > 0 ? "bg-emerald" : "bg-charcoal/35"}`}
              />
              {stockLabel}
            </p>

            <p className="mt-5 max-w-xl text-sm leading-7 text-muted">
              {product.description}
            </p>

            <PurchaseControls product={cartProduct} />

            {!demo ? (
              <div className="mt-3">
                <Suspense fallback={null}>
                  <ProductWhatsappButton productName={product.name} />
                </Suspense>
                <ProductEnquiry productId={product.id} />
              </div>
            ) : null}

            <div className="mt-8 grid gap-3 border-t border-line pt-6 text-xs text-muted sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <Package className="size-4 shrink-0 text-emerald" aria-hidden="true" />
                Bag state lasts for this visit only.
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="size-4 shrink-0 text-emerald" aria-hidden="true" />
                Added {formatDate(product.createdAt)}
                {demo ? " to the demo catalogue" : " to the collection"}.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-8 border-t border-line pt-12 lg:grid-cols-2">
          <section aria-labelledby="benefits-title">
            <h2 id="benefits-title" className="font-display text-2xl text-charcoal">
              Benefits
            </h2>
            <ul className="mt-4 space-y-3">
              {product.benefits.map((benefit) => (
                <li key={benefit} className="flex gap-3 text-sm leading-6 text-muted">
                  <Check className="mt-1 size-4 shrink-0 text-emerald" aria-hidden="true" />
                  {benefit}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="ingredients-title">
            <h2 id="ingredients-title" className="font-display text-2xl text-charcoal">
              Ingredients
            </h2>
            <ul className="mt-4 space-y-2">
              {product.ingredients.map((ingredient) => (
                <li key={ingredient} className="text-sm leading-6 text-muted">
                  {ingredient}
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="usage-title">
            <h2 id="usage-title" className="font-display text-2xl text-charcoal">
              Usage instructions
            </h2>
            <ol className="mt-4 space-y-2">
              {product.usageInstructions.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-muted">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-soft text-[10px] font-semibold text-emerald">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="details-title">
            <h2 id="details-title" className="font-display text-2xl text-charcoal">
              Catalogue details
            </h2>
            <dl className="mt-4 divide-y divide-line text-sm">
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted">Brand</dt>
                <dd className="text-charcoal">{product.brand}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted">Category</dt>
                <dd className="text-charcoal">{product.category}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted">Regular price</dt>
                <dd className="text-charcoal">{formatPrice(product.regularPrice)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted">Product ID</dt>
                <dd className="text-charcoal">{product.id}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section className="mt-16 border-t border-line pt-12" aria-labelledby="reviews-title">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald">
            Customer feedback
          </p>
          <h2 id="reviews-title" className="mt-2 font-display text-3xl text-charcoal">
            Reviews
          </h2>
          {!demo ? (
            <ReviewForm productId={product.id} productSlug={product.slug} />
          ) : null}
          <div className="mt-6">
            <ProductReviewList reviews={reviews} />
          </div>
        </section>

        <section className="mt-16 border-t border-line pt-12" aria-labelledby="related-title">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald">
                You may also like
              </p>
              <h2 id="related-title" className="mt-2 font-display text-3xl text-charcoal">
                Related products
              </h2>
            </div>
            <Link
              href={`/category/${product.categorySlug}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald underline-offset-4 hover:underline"
            >
              More in {product.category}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-8">
            <ProductGrid products={related} />
          </div>
        </section>
      </Container>
    </div>
  );
}

