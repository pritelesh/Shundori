"use client";

import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getCartQuoteAction } from "@/app/(storefront)/checkout/actions";
import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { usePreviewStore } from "@/components/providers/preview-store";
import { ProductVisual } from "@/components/products/product-visual";
import { formatPrice } from "@/utils/format";

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
        <div className="mx-auto max-w-2xl animate-pulse rounded-2xl border border-warm-line bg-warm-white p-8">
          <div className="h-7 w-48 rounded bg-light-beige" />
          <div className="mt-6 h-20 rounded bg-warm-white" />
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
    <Container className="py-10 sm:py-14">
      <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:items-start">
        <section aria-labelledby="bag-items-title">
          <div className="flex items-center justify-between gap-4 border-b border-warm-line pb-4">
            <h2 id="bag-items-title" className="font-display text-2xl text-dark-text">
              Your bag ({cartCount})
            </h2>
            <button
              type="button"
              onClick={clearCart}
              className="text-xs font-medium text-taupe underline-offset-4 hover:text-dark-text hover:underline"
            >
              Clear bag
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-taupe">
            Saved on this device. Prices and stock are checked again at checkout.
          </p>

          {refreshError ? (
            <p
              role="alert"
              className="mt-4 rounded-lg border border-chocolate/40 bg-soft-cream px-4 py-3 text-xs leading-5 text-dark-text"
            >
              {refreshError} Checkout will retry with current catalogue data.
            </p>
          ) : null}

          <ul className="divide-y divide-warm-line">
            {cart.map((item) => (
              <li key={item.id} className="flex gap-4 py-5">
                <Link
                  href={`/product/${item.slug ?? ""}`}
                  className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-warm-line bg-gradient-to-br from-soft-cream to-warm-white sm:size-28"
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
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-olive-deep">
                    {item.brandName ?? "Shundori"}
                  </p>
                  <Link
                    href={`/product/${item.slug ?? ""}`}
                    className="mt-1 block font-display text-lg leading-snug text-dark-text hover:text-olive-deep"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-sm text-taupe">{formatPrice(item.price)}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="inline-flex items-center rounded-full border border-warm-line bg-warm-white">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        onClick={() => setQuantity(item.id, item.quantity - 1)}
                        className="inline-flex size-9 items-center justify-center rounded-full hover:bg-warm-white"
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
                        className="inline-flex size-9 items-center justify-center rounded-full hover:bg-warm-white"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.id)}
                      aria-label={`Remove ${item.name} from bag`}
                      className="inline-flex size-9 items-center justify-center rounded-full text-taupe transition-colors hover:bg-soft-cream hover:text-dark-text"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <p className="shrink-0 text-sm font-medium text-dark-text">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-labelledby="summary-title" className="rounded-2xl border border-warm-line bg-warm-white p-6">
          <h2 id="summary-title" className="font-display text-2xl text-dark-text">
            Order summary
          </h2>
          <dl className="mt-6 space-y-3 border-b border-warm-line pb-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-taupe">Total quantity</dt>
              <dd className="font-medium tabular-nums text-dark-text">{cartCount}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-taupe">Product subtotal</dt>
              <dd className="font-medium text-dark-text">{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-taupe">Delivery charge</dt>
              <dd className="text-taupe">Calculated at checkout</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-taupe">Discount</dt>
              <dd className="text-taupe">Applied at checkout</dd>
            </div>
            <div className="flex justify-between gap-4 pt-3">
              <dt className="font-medium text-dark-text">Cart total</dt>
              <dd className="font-display text-xl text-dark-text">{formatPrice(subtotal)}</dd>
            </div>
          </dl>

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

          <p className="mt-4 text-[11px] leading-5 text-taupe">
            Cash on Delivery is available now. Online payment methods are not simulated.
          </p>
        </aside>
      </div>
    </Container>
  );
}
