import "server-only";

import { assertUuid } from "@/lib/admin-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/services/authorization";
import type { InventoryAlert, InventoryAlertType } from "@/types/phase8";

interface AlertRow {
  id: string;
  product_id: string;
  alert_type: InventoryAlertType;
  threshold_snapshot: number;
  created_at: string;
  resolved_at: string | null;
  products:
    | {
        name: string;
        sku: string | null;
        stock_quantity: number;
      }
    | {
        name: string;
        sku: string | null;
        stock_quantity: number;
      }[]
    | null;
}

interface RelatedProduct {
  name: string;
  sku: string | null;
  stock_quantity: number;
}

function relatedProduct(row: AlertRow): RelatedProduct | null {
  if (!row.products) return null;
  return Array.isArray(row.products) ? row.products[0] ?? null : row.products;
}

function mapAlert(row: AlertRow): InventoryAlert {
  const product = relatedProduct(row);
  return {
    id: row.id,
    productId: row.product_id,
    productName: product?.name ?? "Unavailable product",
    sku: product?.sku ?? null,
    alertType: row.alert_type,
    thresholdSnapshot: row.threshold_snapshot,
    currentStock: product?.stock_quantity ?? 0,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

/** Open alerts only; resolved entries remain in the table as an audit trail. */
export async function listOpenInventoryAlerts(): Promise<InventoryAlert[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("inventory_alerts")
    .select(
      "id, product_id, alert_type, threshold_snapshot, created_at, resolved_at, products(name, sku, stock_quantity)",
    )
    .is("resolved_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data as unknown as AlertRow[]).map(mapAlert);
}

export async function resolveInventoryAlert(id: string): Promise<void> {
  assertUuid(id, "alertId");
  const { user } = await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("inventory_alerts")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq("id", id)
    .is("resolved_at", null);

  if (error) throw error;
}
