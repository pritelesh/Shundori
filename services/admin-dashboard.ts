import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/services/authorization";
import type { OrderRow } from "@/types/database";
import type { OrderStatus } from "@/types/order";

export interface AdminDashboardStats {
  totalProducts: number;
  activeProducts: number;
  outOfStockProducts: number;
  lowStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSales: number;
}

export interface RecentAdminOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number(value ?? 0) || 0;
}

/** All counters come from the phase5_dashboard_stats() database function. */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("phase5_dashboard_stats");

  if (error) throw error;

  const row = (data ?? {}) as Record<string, unknown>;
  return {
    totalProducts: asNumber(row.totalProducts),
    activeProducts: asNumber(row.activeProducts),
    outOfStockProducts: asNumber(row.outOfStockProducts),
    lowStockProducts: asNumber(row.lowStockProducts),
    totalOrders: asNumber(row.totalOrders),
    pendingOrders: asNumber(row.pendingOrders),
    completedOrders: asNumber(row.completedOrders),
    totalSales: asNumber(row.totalSales),
  };
}

export async function getRecentAdminOrders(
  limit = 6,
): Promise<RecentAdminOrder[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, order_status, total_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data as Pick<
    OrderRow,
    "id" | "order_number" | "customer_name" | "order_status" | "total_amount" | "created_at"
  >[]).map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    status: row.order_status,
    total: row.total_amount,
    createdAt: row.created_at,
  }));
}
