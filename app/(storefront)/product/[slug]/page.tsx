import { ArrowRight, ChevronRight, Clock3, Package } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { ProductCarousel } from "@/components/catalog/product-carousel";
import { DemoNotice } from "@/components/catalog/demo-notice";
import { PurchaseControls } from "@/components/catalog/purchase-controls";
import { toCardItem } from "@/lib/catalog-filter";
import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/products/product-card";
import { ProductDetailsTabs } from "@/components/products/product-details-tabs";
import { ProductEnquiry } from "@/components/products/product-enquiry";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductInfoChips } from "@/components/products/product-info-chips";
import { ProductPriceBlock } from "@/components/products/product-price-block";
import { ProductRatingSummary } from "@/components/products/product-rating-summary";
import { ProductWhatsappButton } from "@/components/products/product-whatsapp-button";
import { ReviewForm } from "@/components/products/review-form";
import { effectiveCompareAtPrice, effectivePrice } from "@/lib/offer-pricing";
import {
  jsonLdScript,
  productJsonLd,
  productMetadata,
} from "@/lib/seo";
import { productEnquiryMessage, whatsappUrl } from "@/lib/whatsapp";
import { getPublicStoreSettings } from "@/services/business-settings";
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
import { formatDate } from "@/utils/format";

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
    <Suspense
      fallback={
        <Container className="py-16">
          <p className="text-sm text-ink-soft">Loading product…</p>
        </Container>
      }
    >
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

  const [related, settings] = await Promise.all([
    getRelatedProducts(product, 4),
    getPublicStoreSettings(),
  ]);
  const demo = isDemoCatalogue();
  const reviews = demo ? [] : await getApprovedReviews(product.id);
  const price = effectivePrice(product);
  const compareAtPrice = effectiveCompareAtPrice(product);
  const whatsappHref = settings.whatsappEnabled
    ? whatsappUrl(
        settings.whatsappNumber,
        productEnquiryMessage(product.name, settings.storeName),
      )
    : null;

  const cartProduct: CartProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandName: product.brand,
    price,
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
    <div className="pt-8 pb-16 sm:pt-12 md:pb-0">
      {!demo ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product)) }}
        />
      ) : null}
      <Container>
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1 text-xs text-ink-soft"
        >
          <Link href="/" className="inline-flex min-h-11 min-w-11 items-center text-leaf hover:text-forest hover:underline">
            Home
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <Link href="/shop" className="inline-flex min-h-11 min-w-11 items-center text-leaf hover:text-forest hover:underline">
            Shop
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <Link
            href={`/category/${product.categorySlug}`}
            className="inline-flex min-h-11 min-w-11 items-center text-leaf hover:text-forest hover:underline"
          >
            {product.category}
          </Link>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span className="text-ink-soft">{product.name}</span>
        </nav>

        <DemoNotice demo={demo} className="mt-6" />

        <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery images={product.images} name={product.name} />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/brand/${product.brandSlug}`}
                className="inline-flex min-h-11 items-center text-xs font-medium uppercase tracking-[0.08em] text-leaf underline-offset-4 hover:underline"
              >
                {product.brand}
              </Link>
              <Badge variant="neutral">{product.category}</Badge>
              {product.isFeatured ? <Badge variant="brandSoft">Featured</Badge> : null}
            </div>

            <h1 className="mt-4 font-display text-3xl leading-tight text-forest sm:text-4xl">
              {product.name}
            </h1>

            {product.rating !== null ? (
              <ProductRatingSummary
                rating={product.rating}
                reviewCount={product.reviewCount}
              />
            ) : null}

            <div className="mt-5">
              <ProductPriceBlock product={product} />
            </div>

            <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${product.stockQuantity > 0 ? "bg-leaf" : "bg-ink-soft/35"}`}
              />
              {stockLabel}
            </p>

            <p className="mt-4 max-w-xl text-sm leading-7 text-ink-soft">
              {product.shortDescription || product.description}
            </p>

            <ProductInfoChips product={product} settings={settings} />

            <PurchaseControls
              product={cartProduct}
              price={price}
              compareAtPrice={compareAtPrice}
            />

            {!demo ? (
              <div className="mt-4 space-y-3">
                <ProductWhatsappButton href={whatsappHref} />
                <ProductEnquiry productId={product.id} />
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-sage-light pt-5 text-xs text-ink-soft">
              <p className="flex items-center gap-2">
                <Package className="size-4 shrink-0 text-leaf" aria-hidden="true" />
                Bag state lasts for this visit only.
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="size-4 shrink-0 text-leaf" aria-hidden="true" />
                Listed {formatDate(product.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <section
          id="reviews"
          className="mt-14 scroll-mt-24 border-t border-sage-light pt-10 sm:mt-16 sm:pt-12"
          aria-labelledby="details-title"
        >
          <div className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-leaf">
              Product details
            </p>
            <h2
              id="details-title"
              className="mt-2 font-display text-3xl text-forest"
            >
              Details, ingredients and reviews.
            </h2>
          </div>
          <ProductDetailsTabs
            description={product.description}
            benefits={product.benefits}
            ingredients={product.ingredients}
            usageInstructions={product.usageInstructions}
            reviews={reviews}
            reviewForm={
              demo ? undefined : (
                <ReviewForm productId={product.id} productSlug={product.slug} />
              )
            }
          />
        </section>

        {related.length > 0 ? (
          <section
            className="mt-14 border-t border-sage-light pt-10 sm:mt-16 sm:pt-12"
            aria-labelledby="related-title"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-leaf">
                  You may also like
                </p>
                <h2
                  id="related-title"
                  className="mt-2 font-display text-3xl text-forest"
                >
                  Related products
                </h2>
              </div>
              <Link
                href={`/category/${product.categorySlug}`}
                className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-leaf underline-offset-4 hover:underline"
              >
                More in {product.category}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-6">
              <ProductCarousel label="Related products">
                {related.map((item) => (
                  <li
                    key={item.id}
                    className="w-[70vw] max-w-[17rem] shrink-0 snap-start sm:w-64"
                  >
                    <ProductCard
                      product={toCardItem(item)}
                      href={`/product/${item.slug}`}
                      lowStockThreshold={item.lowStockThreshold}
                      className="h-full"
                    />
                  </li>
                ))}
              </ProductCarousel>
            </div>
          </section>
        ) : null}
      </Container>
    </div>
  );
}
