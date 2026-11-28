"use client";

import { ArrowRight, Banknote, ChevronDown, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getCartQuoteAction } from "@/app/(storefront)/checkout/actions";
import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePreviewStore } from "@/components/providers/preview-store";
import { ProductVisual } from "@/components/products/product-visual";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import { formatPrice } from "@/utils/format";

function SummaryRows({
  cartCount,
  subtotal,
}: {
  cartCount: number;
  subtotal: number;
}) {
  return (
    <dl className="space-y-3 border-b border-sage-light pb-6 text-sm">
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">Total quantity</dt>
        <dd className="font-medium tabular-nums text-ink-soft">{cartCount}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">Product subtotal</dt>
        <dd className="font-medium text-ink-soft">{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">Delivery charge</dt>
        <dd className="text-ink-soft">Calculated at checkout</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-ink-soft">Discount</dt>
        <dd className="text-ink-soft">Applied at checkout</dd>
      </div>
      <div className="flex justify-between gap-4 pt-3">
        <dt className="font-medium text-ink-soft">Cart total</dt>
        <dd className="font-display text-xl text-forest">{formatPrice(subtotal)}</dd>
      </div>
    </dl>
  );
}

function CartTrustNote() {
  const cod = PAYMENT_METHOD_OPTIONS.find(
    (method) => method.id === "cash_on_delivery" && method.enabled,
  );

  return (
    <div className="mt-4 space-y-2 text-xs leading-5 text-ink-soft">
      {cod ? (
        <p className="flex items-start gap-2">
          <Banknote className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden="true" />
          {cod.label} is available. Online payments are not simulated.
        </p>
      ) : null}
      <Link
        href="/track-order"
        className="inline-flex items-center gap-1.5 font-medium text-leaf underline-offset-4 hover:underline"
      >
        Track your order
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

export function CartView() {
  const {
    cart,
    cartCount,
    subtotal,
    ready,
    replaceCart,
    setQuantity,
    removeFromCart,
    clearCart,
  } = usePreviewStore();
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // The saved bag is a cache. Refresh its prices, artwork and stock from the
  // catalogue so the displayed totals match what checkout will recalculate.
  useEffect(() => {
    if (!ready || cart.length === 0) return;

    let cancelled = false;
    const lines = cart.map((item) => ({
      productId: item.id,
      quantity: item.quantity,
    }));

    getCartQuoteAction(lines)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setRefreshError(result.error);
          return;
        }

        setRefreshError(null);
        const freshById = new Map(
          result.data.items.map((item) => [
            item.productId,
            {
              id: item.productId,
              name: item.name,
              slug: item.slug,
              brandName: item.brandName,
              price: item.unitPrice,
              imageUrl: item.imageUrl,
              visual: item.visual,
              tone: item.tone,
              stockQuantity: item.availableStock,
              quantity: item.quantity,
            },
          ]),
        );

        replaceCart(cart.map((item) => freshById.get(item.id) ?? item));
      })
      .catch(() => {
        if (!cancelled) {
          setRefreshError("We could not refresh product details. Please try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [cart, ready, replaceCart]);

  if (!ready) {
    return (
      <Container className="py-14 sm:py-20">
        <div className="mx-auto max-w-2xl animate-pulse surface-card rounded-2xl p-8">
          <div className="h-7 w-48 rounded bg-sage-light" />
          <div className="mt-6 h-20 rounded bg-cream" />
        </div>
      </Container>
    );
  }

  if (cart.length === 0) {
    return (
      <Container className="py-14 sm:py-20">
        <h2 className="sr-only">Bag contents</h2>
        <EmptyState
          icon={ShoppingBag}
          title="Your bag is empty"
          description="Browse the collection and add products to build your order."
          action={
            <Link href="/shop" className={buttonStyles({ variant: "primary", size: "lg" })}>
              Continue shopping
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="pt-10 pb-24 sm:pt-14 lg:pb-14">
      {/* Mobile summary sits above the bag and collapses to a single line. */}
      <details className="group mb-6 surface-card rounded-2xl lg:hidden">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 marker:hidden">
          <span className="min-w-0">
            <span className="block font-display text-lg text-forest">Order summary</span>
            <span className="block text-xs text-ink-soft">
              {cartCount} items · {formatPrice(subtotal)}
            </span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="border-t border-sage-light px-5 pb-5 pt-4">
          <SummaryRows cartCount={cartCount} subtotal={subtotal} />
          <CartTrustNote />
        </div>
      </details>

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <section aria-labelledby="bag-items-title">
          <div className="flex items-center justify-between gap-4 border-b border-sage-light pb-4">
            <h2 id="bag-items-title" className="font-display text-2xl text-forest">
              Your bag ({cartCount})
            </h2>
            <button
              type="button"
              onClick={clearCart}
              className={buttonStyles({ variant: "destructive", size: "sm" })}
            >
              Clear bag
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-ink-soft">
            Saved on this device. Prices and stock are checked again at checkout.
          </p>

          {refreshError ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-forest/40 bg-sage-light px-4 py-3 text-xs leading-5 text-ink-soft"
            >
              {refreshError} Checkout will retry with current catalogue data.
            </p>
          ) : null}

          <ul className="divide-y divide-sage-light">
            {cart.map((item) => (
              <li key={item.id} className="flex gap-4 py-5">
                <Link
                  href={`/product/${item.slug ?? ""}`}
                  className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-sage-light bg-gradient-to-br from-sage-light to-cream sm:size-28"
                  aria-label={item.name}
                >
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="size-full object-contain p-2" />
                  ) : (
                    <ProductVisual
                      shape={item.visual}
                      tone={item.tone}
                      size="sm"
                      className="text-[3rem]"
                    />
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-leaf">
                    {item.brandName ?? "Shundori"}
                  </p>
                  <Link
                    href={`/product/${item.slug ?? ""}`}
                    className="mt-1 block font-display text-lg leading-snug text-forest hover:text-leaf"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft">{formatPrice(item.price)}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-sage-light bg-cream">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-cream"
                      >
                        <Minus className="size-3.5" aria-hidden="true" />
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        onClick={() => setQuantity(item.id, item.quantity + 1)}
                        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-cream"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.name} from bag`}
                      className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sage-light hover:text-ink-soft"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className="shrink-0 text-sm font-medium text-ink-soft">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <aside
          aria-labelledby="summary-title"
          className="hidden surface-card rounded-2xl p-6 lg:block"
        >
          <h2 id="summary-title" className="font-display text-2xl text-forest">
            Order summary
          </h2>
          <div className="mt-6">
            <SummaryRows cartCount={cartCount} subtotal={subtotal} />
          </div>

          <Link
            href="/checkout"
            className={`${buttonStyles({ variant: "primary", size: "lg" })} mt-6 w-full`}
          >
            Proceed to Checkout
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>

          <Link
            href="/shop"
            className={`${buttonStyles({ variant: "outline", size: "lg" })} mt-3 w-full`}
          >
            Continue Shopping
          </Link>

          <CartTrustNote />
        </aside>
      </div>

      {/* Sticky mobile action: above the bottom nav, below the nav's z-index. */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] z-40 border-t border-sage-light bg-cream/95 px-4 py-3 shadow-sticky backdrop-blur md:bottom-5 lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-ink-soft">Cart total · {cartCount} items</p>
            <p className="truncate font-display text-lg text-forest">
              {formatPrice(subtotal)}
            </p>
          </div>
          <Link
            href="/checkout"
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            Checkout
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Container>
  );
}
