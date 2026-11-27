"use client";

import { LoaderCircle, LockKeyhole, Search } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import {
  requestOrderCancellationAction,
  trackOrderAction,
} from "@/app/(storefront)/track-order/actions";
import {
  initialCancellationState,
  initialTrackOrderState,
} from "@/app/(storefront)/track-order/track-order-state";
import { OrderEnquiryForm } from "@/components/orders/order-enquiry-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canCustomerRequestCancellation } from "@/lib/order-tracking";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import { formatDate, formatDateTime, formatPrice } from "@/utils/format";

function cancellationLabel(status: string): string {
  return status === "requested"
    ? "Review pending"
    : status === "approved"
      ? "Approved"
      : status === "rejected"
        ? "Rejected"
        : "None";
}

export function TrackOrderForm() {
  const [trackState, trackAction, tracking] = useActionState(
    trackOrderAction,
    initialTrackOrderState,
  );
  const [cancelState, cancelAction, cancelling] = useActionState(
    requestOrderCancellationAction,
    initialCancellationState,
  );
  const order = cancelState.order ?? trackState.order;

  return (
    <div className="space-y-8">
      <form action={trackAction} className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="orderNumber" className="mb-2 block text-sm font-medium">
              Order number
            </label>
            <Input
              id="orderNumber"
              name="orderNumber"
              autoComplete="off"
              placeholder="SD-20261127-AB12CD34"
              defaultValue={trackState.orderNumber}
              aria-invalid={Boolean(trackState.fieldErrors.orderNumber)}
              aria-describedby="orderNumber-help"
              required
            />
            <p id="orderNumber-help" className="mt-1.5 text-xs text-taupe">
              Find it in your order confirmation.
            </p>
            {trackState.fieldErrors.orderNumber ? (
              <p className="mt-1 text-xs text-chocolate">
                {trackState.fieldErrors.orderNumber}
              </p>
            ) : null}
          </div>

          <div>
            <label htmlFor="phone" className="mb-2 block text-sm font-medium">
              Phone number
            </label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              defaultValue={trackState.phone}
              aria-invalid={Boolean(trackState.fieldErrors.phone)}
              aria-describedby="phone-help"
              required
            />
            <p id="phone-help" className="mt-1.5 text-xs text-taupe">
              Use the number you entered at checkout.
            </p>
            {trackState.fieldErrors.phone ? (
              <p className="mt-1 text-xs text-chocolate">
                {trackState.fieldErrors.phone}
              </p>
            ) : null}
          </div>
        </div>

        {trackState.status === "error" && trackState.message ? (
          <p className="mt-4 rounded-lg bg-soft-cream px-4 py-3 text-sm text-dark-text">
            {trackState.message}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={tracking}>
            {tracking ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            {tracking ? "Searching…" : "Track order"}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-taupe">
            <LockKeyhole className="size-3.5" aria-hidden="true" />
            Both details must match before any order data is shown.
          </p>
        </div>
      </form>

      {order ? (
        <div className="space-y-5">
          <section className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-chocolate">
                  Order found
                </p>
                <h2 className="mt-1 font-display text-2xl">{order.orderNumber}</h2>
                <p className="mt-1 text-sm text-taupe">
                  Placed {formatDate(order.placedAt)}
                </p>
              </div>
              <Badge variant="accentSoft">{order.status}</Badge>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-peach/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-taupe">
                  Payment method
                </p>
                <p className="mt-1 text-sm font-medium">
                  {PAYMENT_METHOD_OPTIONS.find(
                    (option) => option.id === order.paymentMethod,
                  )?.label ?? order.paymentMethod}
                </p>
              </div>
              <div className="rounded-xl bg-peach/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-taupe">
                  Estimated delivery
                </p>
                <p className="mt-1 text-sm font-medium">
                  {order.estimatedDeliveryAt
                    ? formatDateTime(order.estimatedDeliveryAt)
                    : order.courier.state === "connected"
                      ? "Not provided by courier"
                      : "Not available — no courier is connected"}
                </p>
              </div>
              <div className="rounded-xl bg-peach/60 p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-taupe">
                  Cancellation
                </p>
                <p className="mt-1 text-sm font-medium">
                  {cancellationLabel(order.cancellationStatus)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-taupe">
              Items in this order
            </h3>
            <ul className="mt-4 divide-y divide-warm-line/60">
              {order.items.map((item, index) => (
                <li
                  key={`${item.productName}-${index}`}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium">{item.productName}</p>
                    <p className="text-xs text-taupe">
                      {formatPrice(item.unitPrice)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm">{formatPrice(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-taupe">
              Cancel this order
            </h3>

            {canCustomerRequestCancellation(
              order.status,
              order.cancellationStatus,
            ) ? (
              <form action={cancelAction} className="mt-4 max-w-xl">
                <input type="hidden" name="orderNumber" value={order.orderNumber} />
                <input type="hidden" name="phone" value={trackState.phone} />
                <label htmlFor="reason" className="mb-2 block text-sm font-medium">
                  Reason for cancellation
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-warm-line bg-warm-white px-4 py-3 text-sm text-dark-text placeholder:text-taupe/70 focus:border-olive-deep focus:outline-none focus:ring-2 focus:ring-olive-deep/15"
                  placeholder="Tell us why you no longer need this order"
                  aria-invalid={Boolean(cancelState.fieldErrors.reason)}
                  required
                />
                {cancelState.fieldErrors.reason ? (
                  <p className="mt-1 text-xs text-chocolate">
                    {cancelState.fieldErrors.reason}
                  </p>
                ) : null}
                {cancelState.status === "error" && cancelState.message ? (
                  <p className="mt-3 rounded-lg bg-soft-cream px-4 py-3 text-sm">
                    {cancelState.message}
                  </p>
                ) : null}
                {cancelState.status === "success" && cancelState.message ? (
                  <p className="mt-3 rounded-lg bg-olive-soft px-4 py-3 text-sm text-olive-deep">
                    {cancelState.message}
                  </p>
                ) : null}
                <Button type="submit" variant="outline" disabled={cancelling} className="mt-4">
                  {cancelling ? "Submitting…" : "Request cancellation"}
                </Button>
                <p className="mt-3 text-xs leading-5 text-taupe">
                  Requests are reviewed by our team. Stock is only restored after
                  approval; this request does not cancel the order immediately.
                </p>
              </form>
            ) : (
              <p className="mt-3 text-sm leading-6 text-taupe">
                {order.cancellationStatus === "requested"
                  ? "Your cancellation request is waiting for review."
                  : order.cancellationStatus === "approved"
                    ? "This order was cancelled and its stock was restored."
                    : order.cancellationStatus === "rejected"
                      ? "The cancellation request was rejected. Contact support if you need help."
                      : "This order can no longer be cancelled. Contact support if you need help."}
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-taupe">
              Need help with this order?
            </h3>
            <OrderEnquiryForm
              key={order.orderNumber}
              orderNumber={order.orderNumber}
              phone={trackState.phone}
            />
          </section>

          {order.courier.state === "connected" ? (
            <section className="rounded-2xl border border-warm-line bg-warm-white p-6 sm:p-8">
              <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-taupe">
                Courier
              </h3>
              <p className="mt-3 text-sm">
                {order.courier.provider} · {order.courier.providerStatus || "Status not supplied"}
              </p>
              {order.courier.trackingUrl ? (
                <Link
                  href={order.courier.trackingUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-block text-sm underline decoration-chocolate decoration-2 underline-offset-4"
                >
                  Open courier tracking page
                </Link>
              ) : null}
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
