"use client";

import { AlertCircle, ArrowLeft, Banknote, ChevronDown, CreditCard, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

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

// 16px prevents iOS Safari from zooming the viewport when a field is focused.
const inputClass = "h-11 text-base";
const fieldClass =
  "h-11 w-full rounded-lg border border-sage-light bg-cream px-4 text-base text-ink-soft placeholder:text-ink-soft transition-colors focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/15 disabled:opacity-50";

function FieldLabel({
  htmlFor,
  children,
  optional = false,
  required = false,
}: {
  htmlFor: string;
  children: ReactNode;
  optional?: boolean;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-ink-soft">
      {children}
      {required ? (
        <span aria-hidden="true" className="ml-0.5 text-forest">
          *
        </span>
      ) : null}
      {optional ? <span className="ml-1 font-normal text-ink-soft">(optional)</span> : null}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-forest">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
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
        if (cancelled) return;
        setQuote(null);
        setQuoteError("We could not refresh your bag. Please try again.");
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
        <div className="mx-auto max-w-3xl surface-card rounded-2xl p-8 text-center">
          <p className="animate-pulse text-sm text-ink-soft">
            Preparing your checkout…
          </p>
        </div>
      </Container>
    );
  }

  if (cartLines.length === 0 || !quote) {
    return (
      <Container className="py-14 sm:py-20">
        <div className="mx-auto max-w-3xl surface-card rounded-2xl p-8 text-center">
          <h2 className="font-display text-2xl text-forest">
            {quoteError ? "Checkout is unavailable" : "Your bag is empty"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">
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

  const cod = PAYMENT_METHOD_OPTIONS.find(
    (method) => method.id === "cash_on_delivery" && method.enabled,
  );
  // Capture the narrowed quote so the nested summary renderer keeps it.
  const currentQuote = quote;

  // The same summary is rendered once per breakpoint. Unique ids keep the
  // coupon field's label association valid in both copies.
  function renderOrderSummary(idPrefix: string, showSubmit: boolean) {
    const couponId = `${idPrefix}couponCode`;
    return (
      <div className="surface-card rounded-2xl p-6">
        <h2 className="font-display text-2xl text-forest">Order total</h2>
        <div className="mt-5 rounded-xl border border-sage-light bg-mist/40 p-4">
          <label htmlFor={couponId} className="mb-2 block text-xs font-medium text-ink-soft">
            Coupon code
          </label>
          <div className="flex gap-2">
            <Input
              id={couponId}
              value={couponDraft}
              maxLength={30}
              placeholder="e.g. Shundori15"
              onChange={(event) => setCouponDraft(event.target.value.toUpperCase())}
              className={cn(inputClass, "uppercase")}
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
          {currentQuote.couponMessage ? (
            <p
              className={`mt-2 text-xs leading-5 ${
                currentQuote.couponCode ? "text-leaf" : "text-forest"
              }`}
            >
              {currentQuote.couponMessage}
            </p>
          ) : (
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              Coupons are validated against the live order subtotal.
            </p>
          )}
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Total quantity</dt>
            <dd className="font-medium tabular-nums text-ink-soft">{currentQuote.totalQuantity}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Product subtotal</dt>
            <dd className="font-medium text-ink-soft">{formatPrice(currentQuote.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-ink-soft">
              <Truck className="size-3.5" aria-hidden="true" />
              Delivery charge
            </dt>
            <dd className="font-medium text-ink-soft">
              {formatPrice(currentQuote.deliveryCharge)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">Discount</dt>
            <dd className="font-medium text-ink-soft">
              {currentQuote.discount > 0
                ? `−${formatPrice(currentQuote.discount)}`
                : formatPrice(0)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-sage-light pt-4">
            <dt className="font-medium text-ink-soft">Final total</dt>
            <dd className="font-display text-2xl text-forest">
              {formatPrice(currentQuote.total)}
            </dd>
          </div>
        </dl>

        {showSubmit ? (
          <>
            <Button type="submit" size="lg" className="mt-6 w-full" disabled={!canSubmit}>
              {pending ? "Placing order…" : "Place Cash on Delivery order"}
              <CreditCard className="size-4" aria-hidden="true" />
            </Button>
            <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-soft">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-leaf" aria-hidden="true" />
              Prices, stock and totals are recalculated on the server before an order is created.
            </p>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <Container className="pt-10 pb-24 sm:pt-14 lg:pb-14">
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

        {/* Alerts stay outside the breakpoint-specific summaries. */}
        {quoteError ? (
          <p role="alert" className="rounded-lg border border-forest/40 bg-sage-light px-4 py-3 text-sm leading-6 text-ink-soft lg:col-span-2">
            {quoteError}
          </p>
        ) : null}
        {state.status === "error" && state.message ? (
          <p role="alert" className="rounded-lg border border-forest/40 bg-sage-light px-4 py-3 text-sm leading-6 text-ink-soft lg:col-span-2">
            {state.message}
          </p>
        ) : null}

        {/* Trust note is visible without expanding the mobile summary. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-sage-light bg-mist/30 px-4 py-3 text-xs text-ink-soft lg:col-span-2">
          {cod ? (
            <span className="flex items-center gap-2">
              <Banknote className="size-4 shrink-0 text-leaf" aria-hidden="true" />
              {cod.label} available
            </span>
          ) : null}
          <Link
            href="/track-order"
            className="font-medium text-leaf underline-offset-4 hover:underline"
          >
            Track your order
          </Link>
        </div>

        {/* Mobile summary collapses above the form. */}
        <details className="group surface-card rounded-2xl lg:hidden">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 marker:hidden">
            <span className="min-w-0">
              <span className="block font-display text-lg text-forest">Order total</span>
              <span className="block text-xs text-ink-soft">
                {formatPrice(quote.total)} · {quote.totalQuantity} items
              </span>
            </span>
            <ChevronDown
              className="size-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="border-t border-sage-light p-4">
            {renderOrderSummary("mobile-", false)}
            <Link
              href="/cart"
              className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "mt-3 w-full")}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Return to bag
            </Link>
          </div>
        </details>

        <div className="min-w-0 space-y-6">
          <section aria-labelledby="delivery-title" className="surface-card rounded-2xl p-6 sm:p-8">
            <h2 id="delivery-title" className="font-display text-2xl text-forest">
              Delivery details
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              We use these details only to fulfil this order.
            </p>

            <div className="mt-6 space-y-6">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel htmlFor="fullName" required>Full name</FieldLabel>
                  <Input
                    id="fullName"
                    name="fullName"
                    autoComplete="name"
                    placeholder="Your full name"
                    aria-invalid={Boolean(state.fieldErrors.fullName)}
                    aria-describedby="fullName-error"
                    className={inputClass}
                    required
                  />
                  <FieldError id="fullName-error" message={state.fieldErrors.fullName} />
                </div>

                <div>
                  <FieldLabel htmlFor="phone" required>Mobile number</FieldLabel>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01XXXXXXXXX"
                    aria-invalid={Boolean(state.fieldErrors.phone)}
                    aria-describedby="phone-error"
                    className={inputClass}
                    required
                  />
                  <FieldError id="phone-error" message={state.fieldErrors.phone} />
                </div>

                <div>
                  <FieldLabel htmlFor="email" optional>Email address</FieldLabel>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-invalid={Boolean(state.fieldErrors.email)}
                    aria-describedby="email-error"
                    className={inputClass}
                  />
                  <FieldError id="email-error" message={state.fieldErrors.email} />
                </div>
              </div>

              <fieldset className="min-w-0 rounded-xl border border-sage-light/70 bg-mist/30 p-4 sm:p-5">
                <legend className="px-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-leaf">
                  Bangladesh address
                </legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="division" required>Division</FieldLabel>
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
                    <FieldLabel htmlFor="district" required>District</FieldLabel>
                    <Input
                      id="district"
                      name="district"
                      autoComplete="address-level2"
                      placeholder="District"
                      aria-invalid={Boolean(state.fieldErrors.district)}
                      aria-describedby="district-error"
                      className={inputClass}
                      required
                    />
                    <FieldError id="district-error" message={state.fieldErrors.district} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="upazila" required>Upazila / thana</FieldLabel>
                    <Input
                      id="upazila"
                      name="upazila"
                      placeholder="Upazila / thana"
                      aria-invalid={Boolean(state.fieldErrors.upazila)}
                      aria-describedby="upazila-error"
                      className={inputClass}
                      required
                    />
                    <FieldError id="upazila-error" message={state.fieldErrors.upazila} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="postalCode" optional>Postal code</FieldLabel>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      inputMode="numeric"
                      placeholder="1000"
                      aria-invalid={Boolean(state.fieldErrors.postalCode)}
                      aria-describedby="postalCode-error"
                      className={inputClass}
                    />
                    <FieldError id="postalCode-error" message={state.fieldErrors.postalCode} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="min-w-0 surface-card rounded-xl p-4 sm:p-5">
                <legend className="px-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-leaf">
                  Street address &amp; delivery notes
                </legend>
                <div className="space-y-5">
                  <div>
                    <FieldLabel htmlFor="addressLine1" required>Full delivery address</FieldLabel>
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

                  <div>
                    <FieldLabel htmlFor="addressLine2" optional>Additional address details</FieldLabel>
                    <Input
                      id="addressLine2"
                      name="addressLine2"
                      placeholder="Nearby landmark or flat details"
                      aria-invalid={Boolean(state.fieldErrors.addressLine2)}
                      aria-describedby="addressLine2-error"
                      className={inputClass}
                    />
                    <FieldError id="addressLine2-error" message={state.fieldErrors.addressLine2} />
                  </div>

                  <div>
                    <FieldLabel htmlFor="notes" optional>Delivery notes</FieldLabel>
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
              </fieldset>
            </div>
          </section>

          <section aria-labelledby="payment-title" className="surface-card rounded-2xl p-6 sm:p-8">
            <h2 id="payment-title" className="font-display text-2xl text-forest">
              Payment method
            </h2>
            <div className="mt-6 space-y-3">
              {PAYMENT_METHOD_OPTIONS.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 transition-colors",
                    option.enabled
                      ? "cursor-pointer border-leaf/40 bg-leaf/5"
                      : "cursor-not-allowed border-sage-light bg-cream/60 opacity-70",
                  )}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.id}
                    defaultChecked={option.id === "cash_on_delivery"}
                    disabled={!option.enabled}
                    className="mt-0.5 size-4 accent-leaf"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink-soft">
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-[0.08em]",
                          option.enabled
                            ? "bg-leaf/10 text-leaf"
                            : "bg-sage-light/60 text-ink-soft",
                        )}
                      >
                        {option.availability}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-ink-soft">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <FieldError id="payment-error" message={state.fieldErrors.payment} />
            <p className="mt-4 text-xs leading-5 text-ink-soft">
              Cash on Delivery orders stay unpaid until the admin records payment.
              No online payment is simulated.
            </p>
          </section>

          <section aria-labelledby="bag-review-title" className="surface-card rounded-2xl p-6 sm:p-8">
            <h2 id="bag-review-title" className="font-display text-2xl text-forest">
              Your items
            </h2>
            <ul className="mt-5 divide-y divide-sage-light">
              {quote.items.map((item) => (
                <li key={item.productId} className="flex items-center gap-4 py-4">
                  <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden surface-card rounded-xl">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt="" className="size-full object-contain p-1" />
                    ) : (
                      <ProductVisual shape={item.visual} tone={item.tone} size="sm" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink-soft">{item.name}</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-medium tabular-nums text-ink-soft">
                    {formatPrice(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>

            {quote.adjustments.length > 0 ? (
              <div className="mt-4 flex gap-2 surface-card rounded-xl px-4 py-3 text-xs leading-5 text-ink-soft">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden="true" />
                <ul className="space-y-1">
                  {quote.adjustments.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {quote.unavailable.length > 0 ? (
              <div className="mt-4 flex gap-2 rounded-xl border border-forest/40 bg-sage-light px-4 py-3 text-xs leading-5 text-ink-soft">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-forest" aria-hidden="true" />
                <ul className="space-y-1">
                  {quote.unavailable.map((note) => (
                    <li key={note}>{note} Remove it from your bag to continue.</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </div>

        <aside className="hidden min-w-0 space-y-4 lg:sticky lg:top-24 lg:block">
          {renderOrderSummary("", true)}
          <Link
            href="/cart"
            className={cn(buttonStyles({ variant: "ghost", size: "sm" }), "w-full")}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to bag
          </Link>
        </aside>

        {/* Sticky mobile action sits above the bottom nav, not over it. */}
        <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+3.5rem)] z-40 border-t border-sage-light bg-cream/95 px-4 py-3 shadow-sticky backdrop-blur md:bottom-5 lg:hidden">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-ink-soft">Total · {quote.totalQuantity} items</p>
              <p className="truncate font-display text-lg text-forest">
                {formatPrice(quote.total)}
              </p>
            </div>
            <Button type="submit" size="md" disabled={!canSubmit} className="shrink-0">
              {pending ? "Placing…" : "Place Order"}
            </Button>
          </div>
        </div>
      </form>
    </Container>
  );
}
