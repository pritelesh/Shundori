"use client";

import {
  ArrowRight,
  Droplets,
  Flower2,
  LockKeyhole,
  PackageOpen,
  Palette,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";

import {
  CancellationStatusBadge,
  OrderStatusBadge,
} from "@/components/admin/order-status-badge";
import { CatalogBrowser } from "@/components/catalog/catalog-browser";
import { DemoNotice } from "@/components/catalog/demo-notice";
import { ProductGrid } from "@/components/catalog/product-grid";
import { PurchaseControls } from "@/components/catalog/purchase-controls";
import { Container } from "@/components/layout/container";
import { NavigationMenu } from "@/components/layout/navigation-menu";
import { NewsletterSection } from "@/components/layout/newsletter-section";
import { PageHeader } from "@/components/layout/page-header";
import { BrandCard } from "@/components/products/brand-card";
import { CategoryCard } from "@/components/products/category-card";
import { DiscountBadge } from "@/components/products/discount-badge";
import { PriceDisplay } from "@/components/products/price-display";
import { ProductCard } from "@/components/products/product-card";
import { ProductCardSkeleton } from "@/components/products/product-card-skeleton";
import { ProductDetailsTabs } from "@/components/products/product-details-tabs";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductPriceBlock } from "@/components/products/product-price-block";
import { ProductRating } from "@/components/products/product-rating";
import { ProductRatingSummary } from "@/components/products/product-rating-summary";
import { ProductVisual } from "@/components/products/product-visual";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import { mockBrands } from "@/lib/mock/brands";
import {
  mockBrands as mockCatalogBrands,
  mockCategories as mockCatalogCategories,
  mockCatalogProducts,
} from "@/lib/mock/catalog";
import { mockCategories } from "@/lib/mock/categories";
import { mockProducts } from "@/lib/mock/products";
import type { CartProduct } from "@/types/cart";
import { formatPrice } from "@/utils/format";

const categoryIcons = {
  droplets: Droplets,
  palette: Palette,
  sparkles: Sparkles,
  flower: Flower2,
} as const;

const swatches = [
  {
    name: "Forest",
    hex: "#14261A",
    usage: "Headings, primary text and primary actions",
    className: "bg-forest",
    bordered: false,
  },
  {
    name: "Forest Soft",
    hex: "#2D4A33",
    usage: "Primary hover and secondary actions",
    className: "bg-forest-soft",
    bordered: false,
  },
  {
    name: "Leaf",
    hex: "#3A7335",
    usage: "Links and accents",
    className: "bg-leaf",
    bordered: false,
  },
  {
    name: "Sage",
    hex: "#A8AC92",
    usage: "Borders on dark surfaces",
    className: "bg-sage",
    bordered: false,
  },
  {
    name: "Sage Light",
    hex: "#D6D8C4",
    usage: "Soft surfaces and light borders",
    className: "bg-sage-light",
    bordered: true,
  },
  {
    name: "Mist",
    hex: "#EEF0E4",
    usage: "Page background",
    className: "bg-mist",
    bordered: true,
  },
  {
    name: "Cream",
    hex: "#F8F7F0",
    usage: "Cards and content surfaces",
    className: "bg-cream",
    bordered: true,
  },
  {
    name: "Lime",
    hex: "#B6E04B",
    usage: "Cart badge",
    className: "bg-lime",
    bordered: true,
  },
  {
    name: "Ink Soft",
    hex: "#4A5A4C",
    usage: "Body copy",
    className: "bg-ink-soft",
    bordered: false,
  },
] as const;

function PreviewSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-sage-light py-12 first:border-t-0 first:pt-0">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr] lg:gap-12">
        <div>
          <h2 className="font-display text-2xl text-forest">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

export default function DesignPreviewPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { toast } = useToast();
  const previewProduct = mockCatalogProducts[0]!;
  const soldOutProduct = mockCatalogProducts[3]!;
  const baseCard = mockProducts[0]!;
  const secondCard = mockProducts[1]!;
  const previewCartProduct: CartProduct = {
    id: previewProduct.id,
    name: previewProduct.name,
    slug: previewProduct.slug,
    brandName: previewProduct.brand,
    price: previewProduct.salePrice ?? previewProduct.regularPrice,
    imageUrl: null,
    visual: previewProduct.visual,
    tone: previewProduct.tone,
    stockQuantity: previewProduct.stockQuantity,
  };

  return (
    <div>
      <PageHeader
        eyebrow="Internal · Design system"
        title="The Shundori interface kit."
        description="Every reusable component, colour and type style in one place. This page is noindex and is not part of the storefront navigation."
      >
        <Badge variant="accentSoft">
          <Sparkles className="size-3" aria-hidden="true" />
          Internal preview
        </Badge>
      </PageHeader>

      <Container className="py-12 sm:py-16">
        <PreviewSection
          title="Colour"
          description="The nine official Shundori colours. Green-tinted elevation tokens keep surfaces consistent without inline brand values."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {swatches.map((swatch) => (
              <div
                key={swatch.name}
                className="overflow-hidden surface-card rounded-2xl"
              >
                <div
                  className={`h-24 ${swatch.className} ${
                    swatch.bordered ? "border-b border-sage-light" : ""
                  }`}
                />
                <div className="p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-display text-lg text-forest">
                      {swatch.name}
                    </p>
                    <span className="font-mono text-xs uppercase text-ink-soft">
                      {swatch.hex}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink-soft">
                    {swatch.usage}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="rounded-xl border border-sage-light bg-cream px-4 py-3 text-xs text-forest shadow-soft">
              shadow-soft
            </div>
            <div className="rounded-xl border border-sage-light bg-cream px-4 py-3 text-xs text-forest shadow-card">
              shadow-card
            </div>
            <div className="rounded-xl border border-sage-light bg-cream px-4 py-3 text-xs text-forest shadow-panel">
              shadow-panel
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Typography"
          description="Plus Jakarta Sans 700–800 for headings, Inter for body and UI text, Kaushan Script for Latin accents, and Noto Sans Bengali for Bengali labels."
        >
          <div className="space-y-8">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-ink-soft">
                Display — Plus Jakarta Sans
              </p>
              <p className="mt-2 font-display text-4xl font-extrabold leading-[1.05] text-forest sm:text-5xl">
                Authentic beauty, delivered.
              </p>
              <p className="mt-2 font-display text-2xl font-bold text-leaf">
                Everyday essentials
              </p>
              <p className="mt-2 font-script text-3xl text-leaf">
                Cash on delivery
              </p>
            </div>

            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.08em] text-ink-soft">
                Body — Inter
              </p>
              <p className="mt-2 text-base leading-7 text-ink-soft">
                Skincare, makeup and fragrance with clear prices, islandwide
                delivery and cash on delivery across Bangladesh.
              </p>
              <p className="mt-2 text-sm leading-7 text-ink-soft">
                Secondary copy uses a muted green-grey for clear hierarchy.
                Labels use compact uppercase Inter with readable letter spacing.
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-[0.08em] text-leaf">
                Eyebrow label style
              </p>
              <p className="mt-4 font-display text-2xl font-bold text-forest">
                দৈনন্দিক সৌন্দর্য, সহজভাবে
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Bengali — Noto Sans Bengali, forest-soft accents on mist.
              </p>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Buttons"
          description="Forest primary with cream text, forest-soft secondary, plus outline, ghost, destructive and link styles. Enabled states meet AA contrast."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              Primary
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link style</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Preview icon button">
              <Search className="size-4" aria-hidden="true" />
            </Button>
            <Button disabled>Working…</Button>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Badges"
          description="Compact labels for trust marks, promotions and stock states."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="accent">Curated</Badge>
            <Badge variant="accentSoft">In stock</Badge>
            <Badge variant="brand">New in</Badge>
            <Badge variant="brandSoft">Limited</Badge>
            <Badge variant="neutral">Neutral</Badge>
            <Badge variant="outline">Outline</Badge>
            <DiscountBadge price={245000} compareAtPrice={320000} />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Form fields"
          description="Inputs use cream surfaces, sage-light borders and a leaf focus ring."
        >
          <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="preview-email"
                className="text-xs font-medium text-ink-soft"
              >
                Email address
              </label>
              <Input
                id="preview-email"
                type="email"
                placeholder="you@example.com"
                className="mt-2"
              />
            </div>
            <div>
              <label
                htmlFor="preview-phone"
                className="text-xs font-medium text-ink-soft"
              >
                Phone number
              </label>
              <Input
                id="preview-phone"
                type="tel"
                placeholder="+880"
                className="mt-2"
              />
            </div>
            <div className="sm:col-span-2">
              <SearchInput aria-label="Preview search" />
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Price & rating"
          description="Prices are stored in poisha and formatted as BDT. Ratings combine decorative stars with accessible numeric values."
        >
          <div className="space-y-6 surface-card rounded-2xl p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-ink-soft">
                Price display
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <PriceDisplay
                  price={245000}
                  compareAtPrice={320000}
                  size="lg"
                />
                <PriceDisplay price={98000} />
                <PriceDisplay price={450000} compareAtPrice={null} size="sm" />
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-ink-soft">
                Discount badge
              </p>
              <div className="mt-3 flex items-center gap-3">
                <DiscountBadge price={245000} compareAtPrice={320000} />
                <DiscountBadge price={129000} compareAtPrice={165000} />
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-ink-soft">
                Product rating
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-6">
                <ProductRating rating={4.8} reviewCount={126} />
                <ProductRating rating={4.2} reviewCount={38} />
                <ProductRating rating={5} />
              </div>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Product card"
          description="Image area, brand, name, rating, price, discount, stock status, wishlist and add-to-cart — including discounted, low-stock and sold-out states."
        >
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            {mockProducts.slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3">
            <ProductCard
              product={{
                ...baseCard,
                brandName: null,
                rating: null,
                reviewCount: 0,
              }}
              href={`/product/${baseCard.slug}`}
            />
            <ProductCard
              product={{ ...baseCard, stockQuantity: 0, inStock: false }}
              href={`/product/${baseCard.slug}`}
            />
            <ProductCard
              product={{ ...secondCard, stockQuantity: 4, inStock: true }}
              href={`/product/${secondCard.slug}`}
              lowStockThreshold={6}
            />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Loading skeleton"
          description="Shown while product data streams in. Animation is disabled for reduced-motion users."
        >
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Category & brand cards"
          description="Editorial entry points for catalogue navigation."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {mockCategories.map((category) => (
              <CategoryCard
                key={category.slug}
                name={category.name}
                description={category.description}
                productCount={category.productCount}
                icon={categoryIcons[category.icon]}
              />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {mockBrands.map((brand) => (
              <BrandCard
                key={brand.slug}
                name={brand.name}
                tagline={brand.tagline}
                monogram={brand.monogram}
                productCount={brand.productCount}
              />
            ))}
          </div>
        </PreviewSection>

        <PreviewSection
          title="Floating navigation pill"
          description="Desktop primary navigation. The same links become a slide-in panel on mobile."
        >
          <div className="surface-card rounded-2xl p-6">
            <NavigationMenu className="flex flex-wrap gap-1" />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Empty state"
          description="Used when a search or filter returns nothing, with an optional recovery action."
        >
          <EmptyState
            icon={Search}
            title="No products found"
            description="Try a different search term or clear your filters to see the full edit."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  toast({
                    title: "Empty state preview",
                    description: "Filters are not connected yet.",
                    variant: "info",
                  })
                }
              >
                Reset filters
              </Button>
            }
          />
        </PreviewSection>

        <PreviewSection
          title="Modal & toast"
          description="Native dialogs with focus trapping and Escape support, plus non-blocking toast notifications."
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button
              variant="secondary"
              onClick={() =>
                toast({
                  title: "Saved to wishlist",
                  description: "Radiance Renewal Serum",
                  variant: "success",
                })
              }
            >
              Success toast
            </Button>
            <Button
              onClick={() =>
                toast({
                  title: "Added to bag",
                  description: "Preview bag, saved for this visit only.",
                  variant: "promo",
                })
              }
            >
              Promo toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast({
                  title: "Account area opens at launch",
                  description: "Sign-in and order history arrive with the store.",
                  variant: "info",
                })
              }
            >
              Info toast
            </Button>
          </div>

          <Modal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            title="A clear modal"
            description="Built on the native dialog element, with a soft backdrop and a single clear action."
          >
            <p className="text-sm leading-7 text-ink-soft">
              Modals are reserved for focused tasks — size guides, delivery
              details or a confirmation. They close on Escape, on backdrop
              click, and return focus to the trigger.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  toast({
                    title: "Modal confirmed",
                    description: "This is a preview interaction.",
                    variant: "success",
                  });
                }}
              >
                Confirm
              </Button>
            </div>
          </Modal>
        </PreviewSection>

        <PreviewSection
          title="Product grid"
          description="Shared grid with two, three and four column layouts, linked cards and loading-more skeletons."
        >
          <div className="space-y-8">
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                Two columns
              </p>
              <ProductGrid products={mockCatalogProducts.slice(0, 2)} columns="two" />
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                Three columns
              </p>
              <ProductGrid products={mockCatalogProducts.slice(0, 3)} columns="three" />
            </div>
            <div>
              <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
                Four columns + loading state
              </p>
              <ProductGrid
                products={mockCatalogProducts.slice(0, 4)}
                columns="four"
                skeletonCount={2}
              />
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Shop filter"
          description="Interactive desktop sidebar, mobile sheet, active chips, sort, in-stock toggle, price inputs and empty result state."
        >
          <CatalogBrowser
            products={mockCatalogProducts}
            categories={mockCatalogCategories}
            brands={mockCatalogBrands}
            pageSize={4}
          />
        </PreviewSection>

        <PreviewSection
          title="Product detail"
          description="Gallery, rating, price block, purchase controls, factual chips, tabs and the sold-out state."
        >
          <DemoNotice />
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <ProductGallery images={previewProduct.images} name={previewProduct.name} />
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-leaf">
                {previewProduct.brand}
              </p>
              <h3 className="mt-2 font-display text-3xl text-forest">
                {previewProduct.name}
              </h3>
              <ProductRatingSummary
                rating={previewProduct.rating ?? 0}
                reviewCount={previewProduct.reviewCount}
                href="#preview-product-detail"
              />
              <div className="mt-5">
                <ProductPriceBlock product={previewProduct} />
              </div>
              <p className="mt-4 text-sm leading-6 text-ink-soft">
                {previewProduct.shortDescription}
              </p>
              <div id="preview-product-detail" className="mt-6">
                <PurchaseControls
                  product={previewCartProduct}
                  price={previewCartProduct.price}
                  compareAtPrice={previewProduct.salePrice}
                />
              </div>
              <div className="mt-6 rounded-full border border-sage-light bg-cream px-4 py-3 text-sm text-forest">
                {soldOutProduct.name} — out of stock
              </div>
            </div>
          </div>
          <div className="mt-8">
            <ProductDetailsTabs
              description={previewProduct.description}
              benefits={previewProduct.benefits}
              ingredients={previewProduct.ingredients}
              usageInstructions={previewProduct.usageInstructions}
              reviews={[]}
            />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Bag"
          description="Filled bag row, quantity control, remove action, order summary and empty state."
        >
          <div className="surface-card rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 border-b border-sage-light pb-4">
              <h3 className="font-display text-xl text-forest">Your bag (1)</h3>
              <button
                type="button"
                className={buttonStyles({ variant: "destructive", size: "sm" })}
              >
                Clear bag
              </button>
            </div>
            <div className="flex gap-4 py-5">
              <div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sage-light bg-gradient-to-br from-sage-light to-cream">
                <ProductVisual
                  shape={previewCartProduct.visual ?? "tube"}
                  tone={previewCartProduct.tone ?? "emerald"}
                  size="sm"
                  className="text-[3rem]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-leaf">
                  {previewCartProduct.brandName}
                </p>
                <p className="mt-1 font-display text-lg text-forest">
                  {previewCartProduct.name}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {formatPrice(previewCartProduct.price)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-sage-light bg-cream px-3 py-1.5 text-sm text-forest">
                    1
                  </span>
                  <button
                    type="button"
                    aria-label="Preview remove item"
                    className="inline-flex size-11 items-center justify-center rounded-full text-forest hover:bg-sage-light"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2 border-t border-sage-light pt-4 text-sm">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(previewCartProduct.price)}</span>
              </div>
              <div className="flex justify-between font-medium text-forest">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(previewCartProduct.price)}</span>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <EmptyState icon={ShoppingBag} title="Your bag is empty" description="Add a product to see the filled state above." />
          </div>
        </PreviewSection>

        <PreviewSection
          title="Checkout"
          description="Delivery fields, enabled payment methods, order summary and submit states."
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
            <div className="surface-card rounded-2xl p-6">
              <h3 className="font-display text-xl text-forest">Delivery details</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input aria-label="Preview recipient" placeholder="Recipient name" />
                <Input aria-label="Preview phone" placeholder="Phone number" />
                <Input aria-label="Preview address" placeholder="Full address" className="sm:col-span-2" />
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {PAYMENT_METHOD_OPTIONS.filter((method) => method.enabled).map((method) => (
                  <Badge key={method.id} variant={method.id === "cash_on_delivery" ? "accent" : "neutral"}>
                    {method.label}
                  </Badge>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Button>Place order</Button>
                <Button disabled>Submitting…</Button>
              </div>
            </div>
            <div className="surface-card rounded-2xl p-6">
              <h3 className="font-display text-lg text-forest">Order summary</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3 text-ink-soft">
                  <dt>Items</dt>
                  <dd className="tabular-nums">1</dd>
                </div>
                <div className="flex justify-between gap-3 text-ink-soft">
                  <dt>Subtotal</dt>
                  <dd className="tabular-nums">{formatPrice(previewCartProduct.price)}</dd>
                </div>
                <div className="flex justify-between gap-3 font-medium text-forest">
                  <dt>Total</dt>
                  <dd className="tabular-nums">{formatPrice(previewCartProduct.price)}</dd>
                </div>
              </dl>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-soft">
                <LockKeyhole className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden="true" />
                Preview only — no order is created from this page.
              </p>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Footer & newsletter"
          description="Forest-soft footer surface, cream text, link and divider states, plus the newsletter default and confirmation states."
        >
          <div className="overflow-hidden rounded-2xl bg-forest-soft text-cream">
            <NewsletterSection
              id="preview-newsletter"
              titleId="preview-newsletter-title"
              emailId="preview-newsletter-email"
            />
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-cream">
                Shop
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <span className="text-cream">All products</span>
                <span className="text-cream/75">Skincare</span>
                <span className="text-cream/75">Makeup</span>
              </div>
              <div className="mt-5 border-t border-cream/15 pt-4 text-xs text-cream/70">
                © 2026 Shundori. All rights reserved.
              </div>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="Auth & admin states"
          description="Sign-in form, unauthorized notice, admin header, status badges and destructive confirmation."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-forest-soft p-6 text-cream">
              <LockKeyhole className="size-6 text-lime" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl text-cream">Admin sign in</h3>
              <div className="mt-4 space-y-3">
                <Input aria-label="Preview admin email" placeholder="Email address" />
                <Input aria-label="Preview admin password" type="password" placeholder="Password" />
                <Button className="w-full">Sign in</Button>
              </div>
            </div>
            <div className="surface-card rounded-2xl p-6">
              <ShieldCheck className="size-6 text-leaf" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl text-forest">Unauthorized</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                The session is valid but this account cannot open the admin panel.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(["pending", "confirmed", "shipped", "delivered", "cancelled"] as const).map((status) => (
                  <OrderStatusBadge key={status} status={status} />
                ))}
                {(["none", "requested", "approved", "rejected"] as const).map((status) => (
                  <CancellationStatusBadge key={status} status={status} />
                ))}
              </div>
              <div className="mt-5 flex gap-3">
                <Button variant="outline" size="sm">Cancel</Button>
                <Button variant="destructive" size="sm">Delete</Button>
              </div>
            </div>
          </div>
        </PreviewSection>

        <PreviewSection
          title="404 & route error"
          description="Not-found composition and the shared error panel used by route error boundaries."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="surface-card rounded-2xl p-8 text-center">
              <p className="font-script text-5xl text-leaf">404</p>
              <h3 className="mt-3 font-display text-2xl text-forest">This page took a different route.</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                The link may have changed, or the product is no longer listed.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/" className={buttonStyles({ variant: "primary", size: "sm" })}>
                  Back to home
                </Link>
                <Link href="/shop" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  Browse products
                </Link>
              </div>
            </div>
            <div className="surface-card rounded-2xl p-8">
              <PackageOpen className="size-8 text-leaf" aria-hidden="true" />
              <h3 className="mt-3 font-display text-xl text-forest">Something went wrong.</h3>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Retry the request. If it keeps happening, contact support with the
                page address.
              </p>
              <Button className="mt-5" onClick={() => toast({ title: "Retry preview", description: "No request was sent." })}>
                Retry
              </Button>
            </div>
          </div>
        </PreviewSection>

        <p className="mt-4 surface-card rounded-2xl p-5 text-xs leading-6 text-ink-soft">
          The live footer and newsletter section also appear on every storefront
          page. Mock products live in <code>lib/mock/</code> and are never imported
          by services or database code.
        </p>
      </Container>
    </div>
  );
}
