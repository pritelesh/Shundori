import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/services/authorization";
import type {
  AnalyticsReport,
  BestSellingProduct,
  MonthlySale,
  TopBrand,
} from "@/types/phase8";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function defaultFrom(): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 365);
  return isoDate(date);
}

function validDate(value: string | undefined, fallback: string): string {
  if (!value || !DATE_PATTERN.test(value)) return fallback;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? fallback
    : value;
}

function number(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Privileged analytics RPC. The database function returns aggregates only; no
 * customer identity or order-level rows cross this boundary.
 */
export async function getAnalyticsReport(
  from?: string,
  to?: string,
): Promise<AnalyticsReport> {
  await requireAdmin();

  const pFrom = validDate(from, defaultFrom());
  const pTo = validDate(to, isoDate(new Date()));
  if (pTo < pFrom) {
    const [earlier, later] = [pFrom, pTo].sort();
    return getAnalyticsReport(earlier, later);
  }

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase.rpc("phase8_analytics_report", {
    p_from: pFrom,
    p_to: pTo,
  });
  if (error) throw error;

  const report = (data ?? {}) as Record<string, unknown>;
  const totals = (report.totals ?? {}) as Record<string, unknown>;
  const inventory = (report.inventory ?? {}) as Record<string, unknown>;
  const range = (report.range ?? {}) as Record<string, unknown>;

  return {
    range: {
      from: String(range.from ?? pFrom),
      to: String(range.to ?? pTo),
    },
    totals: {
      totalSales: number(totals.totalSales),
      orders: number(totals.orders),
      averageOrderValue: number(totals.averageOrderValue),
      discountTotal: number(totals.discountTotal),
    },
    bestSellingProducts: ((report.bestSellingProducts ?? []) as unknown[]).map(
      (item) => {
        const row = item as Record<string, unknown>;
        return {
          productId: row.productId ? String(row.productId) : null,
          name: String(row.name ?? "Unknown product"),
          quantitySold: number(row.quantitySold),
          revenue: number(row.revenue),
        } satisfies BestSellingProduct;
      },
    ),
    topBrands: ((report.topBrands ?? []) as unknown[]).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        brand: String(row.brand ?? "Unattributed"),
        quantitySold: number(row.quantitySold),
        revenue: number(row.revenue),
      } satisfies TopBrand;
    }),
    monthlySales: ((report.monthlySales ?? []) as unknown[]).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        month: String(row.month ?? ""),
        orders: number(row.orders),
        sales: number(row.sales),
      } satisfies MonthlySale;
    }),
    inventory: {
      skus: number(inventory.skus),
      units: number(inventory.units),
      outOfStock: number(inventory.outOfStock),
      lowStock: number(inventory.lowStock),
      stockValue: number(inventory.stockValue),
    },
  };
}
