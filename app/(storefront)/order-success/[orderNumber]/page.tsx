import { CheckCircle2, LockKeyhole, MapPin, PackageCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { ProductVisual } from "@/components/products/product-visual";
import { buttonStyles } from "@/components/ui/button";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import { getOrderConfirmation } from "@/services/checkout";
import type { OrderConfirmation } from "@/types/checkout";
import { formatDate, formatPrice } from "@/utils/format";

export const metadata: Metadata = {
  title: "Order Confirmation",
  robots: { index: false, follow: false },
};

// Cache Components is enabled globally. This page reads searchParams and an
// uncached Supabase RPC, so it is request-rendered; it deliberately has no
// `"use cache"` scope and must never be wrapped in one.

interface PageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function paymentLabel(method: OrderConfirmation["paymentMethod"]): string {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.id === method)?.label ??
    method.replaceAll("_", " ")
  );
}

function addressLines(order: OrderConfirmation): string[] {
  const address = order.deliveryAddress;
  const upazila = address.upazila ?? address.area;

  return [
    address.addressLine1,
    address.addressLine2,
    upazila,
    address.district,
    address.division,
    address.postalCode,
    address.country,
  ]
    .map((entry) => entry?.trim())
    .filter((entry): entry is string => Boolean(entry));
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-5 py-2 text-sm">
      <dt className="text-taupe">{label}</dt>
      <dd className="text-right font-medium text-dark-text">{value}</dd>
    </div>
  );
}

async function Confirmation({
  params,
  searchParams,
}: PageProps) {
  const { orderNumber } = await params;
  const token = firstValue((await searchParams).token);

  if (!token) notFound();

  const order = await getOrderConfirmation(orderNumber, token);
  if (!order) notFound();

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className="rounded-2xl border border-olive-deep/30 bg-warm-white p-6 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-olive-deep">
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Order placed
              </p>
              <h2 className="mt-3 font-display text-3xl text-dark-text sm:text-4xl">
                Thank you, {order.customerName}.
              </h2>
              <p className="mt-3 text-sm leading-6 text-taupe">
                Your order is recorded. Keep this page private — its link proves
                ownership of this order.
              </p>
            </div>
            <div className="rounded-xl border border-warm-line bg-warm-white px-5 py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-taupe">
                Order number
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-dark-text">
                {order.orderNumber}
              </p>
            </div>
          </div>

          <dl className="mt-7 grid gap-x-10 border-t border-warm-line pt-4 sm:grid-cols-2">
            <SummaryRow label="Order status" value={<span className="capitalize">{order.status}</span>} />
            <SummaryRow label="Payment method" value={paymentLabel(order.paymentMethod)} />
            <SummaryRow label="Payment status" value={<span className="capitalize">{order.paymentStatus}</span>} />
            <SummaryRow label="Placed on" value={formatDate(order.createdAt)} />
            <SummaryRow label="Customer" value={order.customerName} />
            <SummaryRow
              label="Phone"
              value={<span className="tabular-nums">{order.customerPhone}</span>}
            />
            {order.customerEmail ? (
              <SummaryRow label="Email" value={order.customerEmail} />
            ) : null}
          </dl>
        </section>

        <section className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-9">
          <h2 className="flex items-center gap-2 font-display text-2xl text-dark-text">
            <PackageCheck className="size-5 text-olive-deep" aria-hidden="true" />
            Purchased products
          </h2>
          <ul className="mt-5 divide-y divide-warm-line">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-4">
                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-warm-line bg-warm-white">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="size-full object-contain p-1" />
                  ) : (
                    <ProductVisual size="sm" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-dark-text">
                    {item.productName}
                  </p>
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
        </section>

        <div className="grid gap-6 sm:grid-cols-2">
          <section className="rounded-2xl border border-warm-line bg-warm-white p-6">
            <h2 className="font-display text-xl text-dark-text">Delivery address</h2>
            <p className="mt-4 flex items-start gap-2 text-sm leading-7 text-taupe">
              <MapPin className="mt-1 size-4 shrink-0 text-olive-deep" aria-hidden="true" />
              <span>
                {addressLines(order).map((line, index) => (
                  <span key={`${line}-${index}`} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </p>
            {order.notes ? (
              <p className="mt-4 border-t border-warm-line pt-4 text-xs leading-5 text-taupe">
                <span className="font-medium text-dark-text">Delivery notes: </span>
                {order.notes}
              </p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-warm-line bg-warm-white p-6">
            <h2 className="font-display text-xl text-dark-text">Total amount</h2>
            <dl className="mt-4 divide-y divide-warm-line/70">
              <SummaryRow label="Product subtotal" value={formatPrice(order.subtotal)} />
              <SummaryRow label="Delivery charge" value={formatPrice(order.deliveryCharge)} />
              <SummaryRow
                label="Discount"
                value={
                  order.discount > 0
                    ? `−${formatPrice(order.discount)}`
                    : formatPrice(0)
                }
              />
              <div className="flex justify-between gap-5 pt-4">
                <dt className="font-medium text-dark-text">Final total</dt>
                <dd className="font-display text-2xl text-dark-text">
                  {formatPrice(order.total)}
                </dd>
              </div>
            </dl>
            <p className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-taupe">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0 text-olive-deep" aria-hidden="true" />
              Customer details are available only through this private confirmation link.
            </p>
          </section>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className={buttonStyles({ variant: "primary", size: "lg" })}>
            Continue shopping
          </Link>
          <Link href="/" className={buttonStyles({ variant: "outline", size: "lg" })}>
            Back to home
          </Link>
        </div>
      </div>
    </Container>
  );
}

function ConfirmationFallback() {
  return (
    <Container className="py-14 sm:py-20">
      <div className="mx-auto max-w-2xl animate-pulse rounded-2xl border border-warm-line bg-warm-white p-9">
        <div className="h-5 w-36 rounded bg-light-beige" />
        <div className="mt-5 h-10 w-2/3 rounded bg-light-beige" />
        <div className="mt-8 h-24 rounded bg-warm-white" />
      </div>
    </Container>
  );
}

export default function OrderSuccessPage(props: PageProps) {
  return (
    <>
      <PageHeader
        eyebrow="Confirmation"
        title="Your order is in."
        description="This page shows the details stored with your order."
      />
      <Suspense fallback={<ConfirmationFallback />}>
        <Confirmation {...props} />
      </Suspense>
    </>
  );
}
