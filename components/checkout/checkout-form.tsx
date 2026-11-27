"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";

import {
  getCartQuoteAction,
  placeCodOrderAction,
} from "@/app/(storefront)/checkout/actions";
import { BANGLADESH_DIVISIONS } from "@/lib/bangladesh";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import { Container } from "@/components/layout/container";
import { usePreviewStore } from "@/components/providers/preview-store";
import { ProductVisual } from "@/components/products/product-visual";
import { Button, buttonStyles } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type {
  CheckoutMutationState,
  CheckoutQuote,
} from "@/types/checkout";
import { cn } from "@/utils/cn";
import { formatPrice } from "@/utils/format";

const INITIAL_STATE: CheckoutMutationState = {
  status: "idle",
  message: "",
  fieldErrors: {},
};

const fieldClass =
  "h-11 w-full rounded-lg border border-warm-line bg-warm-white px-4 text-sm text-dark-text placeholder:text-taupe/70 transition-colors focus:border-olive-deep focus:outline-none focus:ring-2 focus:ring-olive-deep/15 disabled:opacity-50";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-chocolate">
      {message}
    </p>
  );
}

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `sd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CheckoutForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { cart, ready, replaceCart, clearCart } = usePreviewStore();

  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);
  const [couponDraft, setCouponDraft] = useState("");
  const [couponCode, setCouponCode] = useState<string | null>(null);

  const [state, formAction, pending] = useActionState(
    placeCodOrderAction,
    INITIAL_STATE,
  );
  const handledStateRef = useRef("");

  const cartLines = useMemo(
    () => cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
    [cart],
  );
  const cartSignature = useMemo(
    () => JSON.stringify(cartLines),
    [cartLines],
  );

  // A new key identifies one checkout attempt. It stays stable across a double
  // submit (so the database can deduplicate it) but changes when the bag or a
  // server result changes, letting the user revise details after an error.
  const idempotencyKey = useMemo(() => {
    // Generate only after hydration so the hidden field never differs between
    // the server and client renders.
    if (!ready) return "";
    const cartPart =
      cartSignature.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 24) || "empty";
    const statePart = state.status.replace(/[^A-Za-z0-9_-]/g, "");
    return `${newIdempotencyKey()}-${cartPart}-${statePart}`;
  }, [cartSignature, state, ready]);

  useEffect(() => {
    if (!ready || cartLines.length === 0) return;

    let cancelled = false;
    // Defer the loading update so an effect body never triggers a synchronous
    // cascading render.
    Promise.resolve().then(() => {
      if (!cancelled) setQuoteLoading(true);
    });

    getCartQuoteAction({ lines: cartLines, couponCode })
      .then((result) => {
        if (cancelled) return;

        if (!result.ok) {
          setQuote(null);
          setQuoteError(result.error);
          return;
        }

        setQuote(result.data);
        setQuoteError(null);

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

        // Keep unavailable products visible with an explicit warning, but sync
        // current prices, artwork and stock-clamped quantities for the rest.
        replaceCart(
          cart.map((item) => freshById.get(item.id) ?? item),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setQuote(null);
          setQuoteError("We could not refresh your bag. Please try again.");
        }
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [cart, cartLines, cartSignature, couponCode, ready, replaceCart, state]);

  useEffect(() => {
    if (pending) handledStateRef.current = "";
  }, [pending]);

  useEffect(() => {
    if (state.status === "success" && state.orderNumber && state.confirmationToken) {
      const marker = `success:${state.orderNumber}`;
      if (handledStateRef.current === marker) return;
      handledStateRef.current = marker;
      clearCart();
      router.replace(
        `/order-success/${encodeURIComponent(state.orderNumber)}?token=${encodeURIComponent(state.confirmationToken)}`,
      );
      return;
    }

    if (state.status === "error" && state.message) {
      const marker = `error:${state.message}:${JSON.stringify(state.fieldErrors)}`;
      if (handledStateRef.current === marker) return;
      handledStateRef.current = marker;
      toast({
        title: "Order not placed",
        description: state.message,
        variant: "promo",
      });
    }
  }, [state, clearCart, router, toast]);

  if (!ready || (cartLines.length > 0 && quoteLoading && !quote)) {
    return (
      <Container className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-warm-line bg-warm-white p-8 text-center">
          <p className="animate-pulse text-sm text-taupe">
            Preparing your checkout…
          </p>
        </div>
      </Container>
    );
  }

  if (cartLines.length === 0 || !quote) {
    return (
      <Container className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl rounded-2xl border border-warm-line bg-warm-white p-8 text-center">
          <h2 className="font-display text-2xl text-dark-text">
            {quoteError ? "Checkout is unavailable" : "Your bag is empty"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-taupe">
            {cartLines.length === 0
              ? "Add a product to your bag before continuing to checkout."
              : (quoteError ?? "Your bag could not be priced.")}
          </p>
          <Link
            href="/cart"
            className={cn(buttonStyles({ variant: "outline", size: "lg" }), "mt-6")}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to bag
          </Link>
        </div>
      </Container>
    );
  }

  const canSubmit =
    quote.items.length > 0 &&
    quote.unavailable.length === 0 &&
    !quoteLoading &&
    !pending &&
    idempotencyKey.length >= 16;

  return (
    <Container className="py-10 sm:py-14">
      <form action={formAction} className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
        <input type="hidden" name="paymentMethod" value="cash_on_delivery" />
        <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
        <input type="hidden" name="couponCode" value={quote.couponCode ?? ""} />
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(
            quote.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          )}
        />

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="delivery-title" className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
            <h2 id="delivery-title" className="font-display text-2xl text-dark-text">
              Delivery details
            </h2>
            <p className="mt-2 text-sm text-taupe">
              We use these details only to fulfil this order.
            </p>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="fullName" className="mb-2 block text-sm font-medium">
                  Full name
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Your full name"
                  aria-invalid={Boolean(state.fieldErrors.fullName)}
                  aria-describedby="fullName-error"
                  required
                />
                <FieldError id="fullName-error" message={state.fieldErrors.fullName} />
              </div>

              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-medium">
                  Phone number
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01XXXXXXXXX"
                  aria-invalid={Boolean(state.fieldErrors.phone)}
                  aria-describedby="phone-error"
                  required
                />
                <FieldError id="phone-error" message={state.fieldErrors.phone} />
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  Email <span className="font-normal text-taupe">(optional)</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-invalid={Boolean(state.fieldErrors.email)}
                  aria-describedby="email-error"
                />
                <FieldError id="email-error" message={state.fieldErrors.email} />
              </div>

              <div>
                <label htmlFor="division" className="mb-2 block text-sm font-medium">
                  Division
                </label>
                <select
                  id="division"
                  name="division"
                  className={fieldClass}
                  defaultValue=""
                  aria-invalid={Boolean(state.fieldErrors.division)}
                  aria-describedby="division-error"
                  required
                >
                  <option value="" disabled>
                    Select a division
                  </option>
                  {BANGLADESH_DIVISIONS.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
                <FieldError id="division-error" message={state.fieldErrors.division} />
              </div>

              <div>
                <label htmlFor="district" className="mb-2 block text-sm font-medium">
                  District
                </label>
                <Input
                  id="district"
                  name="district"
                  autoComplete="address-level2"
                  placeholder="District"
                  aria-invalid={Boolean(state.fieldErrors.district)}
                  aria-describedby="district-error"
                  required
                />
                <FieldError id="district-error" message={state.fieldErrors.district} />
              </div>

              <div>
                <label htmlFor="upazila" className="mb-2 block text-sm font-medium">
                  Upazila
                </label>
                <Input
                  id="upazila"
                  name="upazila"
                  placeholder="Upazila / thana"
                  aria-invalid={Boolean(state.fieldErrors.upazila)}
                  aria-describedby="upazila-error"
                  required
                />
                <FieldError id="upazila-error" message={state.fieldErrors.upazila} />
              </div>

              <div>
                <label htmlFor="postalCode" className="mb-2 block text-sm font-medium">
                  Postal code <span className="font-normal text-taupe">(optional)</span>
                </label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  inputMode="numeric"
                  placeholder="1000"
                  aria-invalid={Boolean(state.fieldErrors.postalCode)}
                  aria-describedby="postalCode-error"
                />
                <FieldError id="postalCode-error" message={state.fieldErrors.postalCode} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="addressLine1" className="mb-2 block text-sm font-medium">
                  Full delivery address
                </label>
                <textarea
                  id="addressLine1"
                  name="addressLine1"
                  rows={3}
                  className={cn(fieldClass, "h-auto py-3")}
                  placeholder="House, road, area, landmark"
                  aria-invalid={Boolean(state.fieldErrors.addressLine1)}
                  aria-describedby="addressLine1-error"
                  required
                />
                <FieldError id="addressLine1-error" message={state.fieldErrors.addressLine1} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="addressLine2" className="mb-2 block text-sm font-medium">
                  Additional address details <span className="font-normal text-taupe">(optional)</span>
                </label>
                <Input
                  id="addressLine2"
                  name="addressLine2"
                  placeholder="Nearby landmark or flat details"
                  aria-invalid={Boolean(state.fieldErrors.addressLine2)}
                  aria-describedby="addressLine2-error"
                />
                <FieldError id="addressLine2-error" message={state.fieldErrors.addressLine2} />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="notes" className="mb-2 block text-sm font-medium">
                  Delivery notes <span className="font-normal text-taupe">(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={2}
                  className={cn(fieldClass, "h-auto py-3")}
                  placeholder="Anything the delivery partner should know"
                  aria-invalid={Boolean(state.fieldErrors.notes)}
                  aria-describedby="notes-error"
                />
                <FieldError id="notes-error" message={state.fieldErrors.notes} />
              </div>
            </div>
          </section>

          <section aria-labelledby="payment-title" className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
            <h2 id="payment-title" className="font-display text-2xl text-dark-text">
              Payment method
            </h2>
            <div className="mt-6 space-y-3">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                    option.enabled
                      ? "cursor-pointer border-olive-deep/40 bg-olive/5"
                      : "cursor-not-allowed border-warm-line bg-warm-white/60 opacity-70",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.id}
                    defaultChecked={option.id === "cash_on_delivery"}
                    disabled={!option.enabled}
                    className="mt-0.5 size-4 accent-olive-deep"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-dark-text">
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]",
                          option.enabled
                            ? "bg-olive/10 text-olive-deep"
                            : "bg-warm-line/60 text-taupe",
                        )}
                      >
                        {option.availability}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-taupe">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError id="payment-error" message={state.fieldErrors.payment} />
            <p className="mt-4 text-xs leading-5 text-taupe">
              Cash on Delivery orders stay unpaid until the admin records payment.
              No online payment is simulated.
            </p>
          </section>

          <section aria-labelledby="bag-review-title" className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
            <h2 id="bag-review-title" className="font-display text-2xl text-dark-text">
              Your items
            </h2>
            <ul className="mt-5 divide-y divide-warm-line">
              {quote.items.map((item) => (
                <li key={item.productId} className="flex items-center gap-4 py-4">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-warm-line bg-warm-white">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="size-full object-contain p-1" />
                    ) : (
                      <ProductVisual shape={item.visual} tone={item.tone} size="sm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-dark-text">{item.name}</p>
                    <p className="mt-1 text-xs text-taupe">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-dark-text">
                    {formatPrice(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>

            {quote.adjustments.length > 0 ? (
              <div className="mt-4 flex gap-2 rounded-xl border border-warm-line bg-warm-white px-4 py-3 text-xs leading-5 text-taupe">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-olive-deep" aria-hidden="true" />
                <ul className="space-y-1">
                  {quote.adjustments.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {quote.unavailable.length > 0 ? (
              <div className="mt-4 flex gap-2 rounded-xl border border-chocolate/40 bg-soft-cream px-4 py-3 text-xs leading-5 text-dark-text">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-chocolate" aria-hidden="true" />
                <ul className="space-y-1">
                  {quote.unavailable.map((note) => (
                    <li key={note}>{note} Remove it from your bag to continue.</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-warm-line bg-warm-white p-6">
            <h2 className="font-display text-2xl text-dark-text">Order total</h2>
            <div className="mt-5 rounded-xl border border-warm-line bg-peach/40 p-4">
              <label htmlFor="couponCode" className="mb-2 block text-xs font-medium text-dark-text">
                Coupon code
              </label>
              <div className="flex gap-2">
                <Input
                  id="couponCode"
                  value={couponDraft}
                  maxLength={30}
                  placeholder="e.g. Shundori15"
                  onChange={(event) => setCouponDraft(event.target.value.toUpperCase())}
                  className="uppercase"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={quoteLoading}
                  onClick={() => {
                    const next = couponDraft.trim().toUpperCase() || null;
                    setCouponCode(next);
                    setCouponDraft(next ?? "");
                  }}
                >
                  Apply
                </Button>
              </div>
              {quote.couponMessage ? (
                <p
                  className={`mt-2 text-xs leading-5 ${
                    quote.couponCode ? "text-olive-deep" : "text-chocolate"
                  }`}
                >
                  {quote.couponMessage}
                </p>
              ) : (
                <p className="mt-2 text-[11px] leading-5 text-taupe">
                  Coupons are validated against the live order subtotal.
                </p>
              )}
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">Total quantity</dt>
                <dd className="font-medium tabular-nums text-dark-text">{quote.totalQuantity}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">Product subtotal</dt>
                <dd className="font-medium text-dark-text">{formatPrice(quote.subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-taupe">
                  <Truck className="size-3.5" aria-hidden="true" />
                  Delivery charge
                </dt>
                <dd className="font-medium text-dark-text">
                  {formatPrice(quote.deliveryCharge)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-taupe">Discount</dt>
                <dd className="font-medium text-dark-text">
                  {quote.discount > 0 ? `−${formatPrice(quote.discount)}` : formatPrice(0)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-warm-line pt-4">
                <dt className="font-medium text-dark-text">Final total</dt>
                <dd className="font-display text-2xl text-dark-text">
                  {formatPrice(quote.total)}
                </dd>
              </div>
            </dl>

            {state.status === "error" && state.message ? (
              <p
                role="alert"
                className="mt-5 rounded-lg border border-chocolate/40 bg-soft-cream px-4 py-3 text-xs leading-5 text-dark-text"
              >
                {state.message}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="mt-6 w-full" disabled={!canSubmit}>
              {pending ? "Placing order…" : "Place Cash on Delivery order"}
              <CreditCard className="size-4" aria-hidden="true" />
            </Button>
            {quoteError ? (
              <p className="mt-3 text-xs leading-5 text-chocolate">{quoteError}</p>
            ) : null}
            <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-taupe">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-olive-deep" aria-hidden="true" />
              Prices, stock and totals are recalculated on the server before an order is created.
            </p>
          </div>

          <Link
            href="/cart"
            className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "w-full")}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to bag
          </Link>
        </aside>
      </form>
    </Container>
  );
}
