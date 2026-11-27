import {
  CircleAlert,
  ClipboardList,
  Package,
  PackageCheck,
  ShoppingCart,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { buttonStyles } from "@/components/ui/button";
import {
  getAdminDashboardStats,
  getRecentAdminOrders,
} from "@/services/admin-dashboard";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listAdminProducts } from "@/services/admin-products";
import { formatDate, formatPrice } from "@/utils/format";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

const statCards = [
  { key: "totalProducts", label: "Total products", icon: Package },
  { key: "activeProducts", label: "Active products", icon: PackageCheck },
  { key: "outOfStockProducts", label: "Out of stock", icon: TriangleAlert },
  { key: "lowStockProducts", label: "Low stock", icon: CircleAlert },
  { key: "totalOrders", label: "Total orders", icon: ShoppingCart },
  { key: "pendingOrders", label: "Pending orders", icon: ClipboardList },
  { key: "completedOrders", label: "Completed orders", icon: PackageCheck },
  { key: "totalSales", label: "Total sales", icon: TrendingUp },
] as const;

export default async function AdminDashboardPage() {
  await guardAdminPage();
  const [stats, orders, lowStock, outOfStock] = await Promise.all([
    getAdminDashboardStats(),
    getRecentAdminOrders(),
    listAdminProducts({ stock: "low" }),
    listAdminProducts({ stock: "out" }),
  ]);

  const values: Record<(typeof statCards)[number]["key"], number> = stats;

  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="A live snapshot of catalogue health, orders and revenue from your Supabase database."
        actions={
          <Link href="/admin/products/new" className={buttonStyles()}>
            Add product
          </Link>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="rounded-2xl border border-warm-line bg-warm-white p-5 shadow-soft"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-taupe">
                {label}
              </p>
              <span className="flex size-9 items-center justify-center rounded-full bg-soft-cream">
                <Icon className="size-4 text-dark-text" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-4 font-display text-3xl text-dark-text">
              {key === "totalSales"
                ? formatPrice(values[key] ?? 0)
                : (values[key] ?? 0).toLocaleString("en-BD")}
            </p>
          </div>
        ))}
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-warm-line bg-warm-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-olive-deep hover:underline"
            >
              View all
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="mt-6 rounded-xl bg-warm-white px-4 py-8 text-center text-sm text-taupe">
              No orders yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-warm-line/70">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {order.orderNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-taupe">
                      {order.customerName} · {formatDate(order.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatPrice(order.total)}
                    </p>
                    <p className="mt-0.5 text-xs capitalize text-taupe">
                      {order.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-warm-line bg-warm-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Stock attention</h2>
            <Link
              href="/admin/inventory"
              className="text-xs font-medium text-olive-deep hover:underline"
            >
              Manage inventory
            </Link>
          </div>
          {[...outOfStock, ...lowStock].length === 0 ? (
            <p className="mt-6 rounded-xl bg-olive-soft px-4 py-8 text-center text-sm text-olive-deep">
              Everything is well stocked.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {[...outOfStock, ...lowStock].slice(0, 8).map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-warm-line/70 px-4 py-2.5"
                >
                  <span className="truncate text-sm">{product.name}</span>
                  <span
                    className={
                      product.stockQuantity === 0
                        ? "shrink-0 rounded-full bg-soft-cream px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                        : "shrink-0 rounded-full bg-light-beige px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                    }
                  >
                    {product.stockQuantity === 0
                      ? "Out"
                      : `${product.stockQuantity} left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
