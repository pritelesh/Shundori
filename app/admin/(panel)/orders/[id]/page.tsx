import {
  ArrowLeft,
  MapPin,
  Package,
  ReceiptText,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { CancellationDecision } from "@/components/admin/cancellation-decision";
import {
  CancellationStatusBadge,
  OrderStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { Badge } from "@/components/ui/badge";
import { assertUuid } from "@/lib/admin-validation";
import { COURIER_ADAPTERS } from "@/lib/courier";
import { guardAdminPage } from "@/services/admin-page-guard";
import { getAdminOrderDetails } from "@/services/orders";
import type { PaymentMethod } from "@/types/order";
import { formatDate, formatDateTime, formatPrice } from "@/utils/format";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Order details",
  robots: { index: false, follow: false },
};

function paymentLabel(method: PaymentMethod): string {
  const known: Partial<Record<PaymentMethod, string>> = {
    cash_on_delivery: "Cash on delivery",
    bkash: "bKash",
    nagad: "Nagad",
    sslcommerz: "SSLCommerz",
  };
  return (
    known[method] ??
    method
      .replaceAll("_", " ")
      .replace(/^\w/, (letter) => letter.toUpperCase())
  );
}

function DetailCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="surface-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        {Icon ? <Icon className="size-4 text-leaf" aria-hidden="true" /> : null}
        <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-sage-light/60 py-2 last:border-none last:pb-0">
      <dt className="text-xs uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
      <dd className="text-sm text-ink-soft">{value}</dd>
    </div>
  );
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await guardAdminPage();
  const { id } = await params;
  assertUuid(id);

  const details = await getAdminOrderDetails(id);
  if (!details) notFound();

  const { order, statusHistory, courier } = details;

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations / Orders"
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)} · Last updated ${formatDateTime(order.updatedAt)}`}
        actions={
          <Link
            href="/admin/orders"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink-soft/15 px-4 text-xs font-medium hover:border-ink-soft/35 hover:bg-cream"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to orders
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <DetailCard title="Fulfilment" icon={Package}>
          <dl>
            <DetailRow
              label="Order status"
              value={
                <div className="flex flex-wrap items-center gap-3">
                  <OrderStatusBadge status={order.status} />
                  <OrderStatusControl
                    id={order.id}
                    status={order.status}
                    cancellationStatus={order.cancellationStatus}
                  />
                  {order.cancellationStatus === "requested" ? (
                    <span className="text-xs text-ink-soft">
                      Decide the request before changing the status.
                    </span>
                  ) : null}
                </div>
              }
            />
            <DetailRow
              label="Cancellation"
              value={<CancellationStatusBadge status={order.cancellationStatus} />}
            />
            <DetailRow
              label="Payment method"
              value={paymentLabel(order.paymentMethod)}
            />
            <DetailRow
              label="Payment status"
              value={<span className="capitalize">{order.paymentStatus}</span>}
            />
            <DetailRow label="Order date" value={formatDate(order.createdAt)} />
            <DetailRow
              label="Stock restored"
              value={order.cancellationStockRestored ? "Yes" : "No"}
            />
          </dl>
        </DetailCard>

        <DetailCard title="Customer" icon={ReceiptText}>
          <dl>
            <DetailRow label="Name" value={order.shippingAddress.fullName} />
            <DetailRow label="Phone" value={order.shippingAddress.phone || "—"} />
            <DetailRow
              label="Email"
              value={order.shippingAddress.email || order.customerId || "Guest checkout"}
            />
            <DetailRow
              label="Account"
              value={order.customerId ? "Signed-in customer" : "Guest checkout"}
            />
            {order.notes ? (
              <DetailRow label="Customer note" value={order.notes} />
            ) : null}
          </dl>
        </DetailCard>

        <DetailCard title="Delivery address" icon={MapPin}>
          <address className="space-y-1 text-sm not-italic text-ink-soft">
            <p>{order.shippingAddress.addressLine1}</p>
            {order.shippingAddress.addressLine2 ? (
              <p>{order.shippingAddress.addressLine2}</p>
            ) : null}
            <p>
              {[
                order.shippingAddress.upazila,
                order.shippingAddress.district,
                order.shippingAddress.division,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {order.shippingAddress.postalCode ? (
              <p>Postal code: {order.shippingAddress.postalCode}</p>
            ) : null}
            <p>{order.shippingAddress.country || "Bangladesh"}</p>
          </address>
        </DetailCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <DetailCard title="Purchased products" icon={Package}>
          {order.items.length === 0 ? (
            <p className="text-sm text-ink-soft">No item records found.</p>
          ) : (
            <ul className="divide-y divide-sage-light/60">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-ink-soft">
                      {item.variantLabel ? `${item.variantLabel} · ` : ""}
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
          )}
        </DetailCard>

        <DetailCard title="Order totals" icon={ReceiptText}>
          <dl>
            <DetailRow label="Subtotal" value={formatPrice(order.subtotal)} />
            <DetailRow label="Delivery charge" value={formatPrice(order.shippingFee)} />
            <DetailRow
              label="Discount"
              value={`− ${formatPrice(order.discountTotal)}`}
            />
            <DetailRow
              label="Final total"
              value={<span className="font-semibold">{formatPrice(order.total)}</span>}
            />
          </dl>
        </DetailCard>

        <DetailCard title="Courier readiness">
          {courier.state === "connected" ? (
            <dl>
              <DetailRow label="Provider" value={courier.provider} />
              <DetailRow
                label="Provider status"
                value={courier.providerStatus || "Not supplied"}
              />
              <DetailRow
                label="Estimated delivery"
                value={
                  courier.estimatedDeliveryAt
                    ? formatDateTime(courier.estimatedDeliveryAt)
                    : "Not available"
                }
              />
              {courier.trackingUrl ? (
                <DetailRow
                  label="Tracking link"
                  value={
                    <a
                      href={courier.trackingUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="underline decoration-forest decoration-2 underline-offset-4"
                    >
                      Open provider page
                    </a>
                  }
                />
              ) : null}
            </dl>
          ) : (
            <div className="space-y-3 text-sm leading-6 text-ink-soft">
              <p>
                No courier shipment is connected. No tracking status or delivery
                estimate is generated by Shundori.
              </p>
              <div className="flex flex-wrap gap-2">
                {COURIER_ADAPTERS.map((adapter) => (
                  <Badge key={adapter.provider} variant="neutral">
                    {adapter.label} · planned
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </DetailCard>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <DetailCard title="Status history">
          <ol className="space-y-4">
            {statusHistory.map((entry) => (
              <li key={entry.id} className="border-l-2 border-leaf/30 pl-4">
                <div className="flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={entry.toStatus} />
                  <span className="text-xs text-ink-soft">
                    {formatDateTime(entry.createdAt)} · {entry.actorType}
                    {entry.fromStatus && entry.fromStatus !== entry.toStatus
                      ? ` · from ${entry.fromStatus}`
                      : ""}
                  </span>
                </div>
                {entry.note ? (
                  <p className="mt-1 text-sm text-ink-soft">{entry.note}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </DetailCard>

        <DetailCard title="Cancellation request">
          {order.cancellationStatus === "none" ? (
            <p className="text-sm leading-6 text-ink-soft">
              No cancellation request has been submitted for this order.
            </p>
          ) : (
            <div className="space-y-4">
              <dl>
                <DetailRow
                  label="Requested"
                  value={
                    order.cancellationRequestedAt
                      ? formatDateTime(order.cancellationRequestedAt)
                      : "—"
                  }
                />
                <DetailRow
                  label="Reason"
                  value={order.cancellationReason || "No reason supplied"}
                />
                <DetailRow
                  label="Decided"
                  value={
                    order.cancellationDecidedAt
                      ? formatDateTime(order.cancellationDecidedAt)
                      : "Awaiting decision"
                  }
                />
                {order.cancellationDecisionNote ? (
                  <DetailRow
                    label="Decision note"
                    value={order.cancellationDecisionNote}
                  />
                ) : null}
              </dl>

              {order.cancellationStatus === "requested" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <CancellationDecision orderId={order.id} approve={true} />
                  <CancellationDecision orderId={order.id} approve={false} />
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  This request has already been decided.
                </p>
              )}
            </div>
          )}
        </DetailCard>
      </div>
    </>
  );
}
