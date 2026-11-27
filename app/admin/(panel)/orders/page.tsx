import { ClipboardList } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  CancellationStatusBadge,
  OrderStatusBadge,
} from "@/components/admin/order-status-badge";
import { OrderStatusControl } from "@/components/admin/order-status-control";
import { EmptyState } from "@/components/ui/empty-state";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listAllOrdersForAdmin } from "@/services/orders";
import type { PaymentMethod } from "@/types/order";
import { formatDate, formatPrice } from "@/utils/format";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Orders",
  robots: { index: false, follow: false },
};

function paymentLabel(method: PaymentMethod): string {
  if (method === "cash_on_delivery") return "Cash on delivery";
  return method
    .replaceAll("_", " ")
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

export default async function AdminOrdersPage() {
  await guardAdminPage();
  const orders = await listAllOrdersForAdmin();

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Orders"
        description="Review customer orders and update fulfilment status. Payment details and totals are never editable here."
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No orders yet"
          description="Customer orders will appear here as soon as they are placed."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left text-sm">
              <thead className="bg-cream-soft text-[10px] uppercase tracking-[0.16em] text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Order</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Phone</th>
                  <th className="px-5 py-3 font-medium">Items</th>
                  <th className="px-5 py-3 font-medium">Total</th>
                  <th className="px-5 py-3 font-medium">Payment method</th>
                  <th className="px-5 py-3 font-medium">Payment status</th>
                  <th className="px-5 py-3 font-medium">Order status</th>
                  <th className="px-5 py-3 font-medium">Cancellation</th>
                  <th className="px-5 py-3 font-medium">Order date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-cream/40">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="underline decoration-pink decoration-2 underline-offset-4 hover:text-emerald"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3">{order.shippingAddress.fullName}</td>
                    <td className="px-5 py-3 text-muted">
                      {order.shippingAddress.phone || "—"}
                    </td>
                    <td className="px-5 py-3 text-muted">{order.items.length}</td>
                    <td className="px-5 py-3">{formatPrice(order.total)}</td>
                    <td className="px-5 py-3 text-muted">
                      {paymentLabel(order.paymentMethod)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="capitalize text-muted">
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-start gap-2">
                        <OrderStatusBadge status={order.status} />
                        <OrderStatusControl
                          id={order.id}
                          status={order.status}
                          cancellationStatus={order.cancellationStatus}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <CancellationStatusBadge status={order.cancellationStatus} />
                    </td>
                    <td className="px-5 py-3 text-muted">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
