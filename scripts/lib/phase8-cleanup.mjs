import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

export function loadLocalEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase credentials are required for Phase 8 cleanup.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function deleteWhere(admin, table, column, values) {
  const ids = [...new Set(values.filter(Boolean))];
  if (ids.length === 0) return 0;
  const { error } = await admin.from(table).delete().in(column, ids);
  if (error) throw error;
  return ids.length;
}

/**
 * Removes every throwaway row created by audit-phase8.mjs and restores all
 * settings it touched. Safe to call more than once.
 */
export async function cleanupPhase8Data(data) {
  loadLocalEnv();
  const admin = adminClient();
  const ids = data.ids ?? {};
  const removed = {};

  // Restore business settings before removing the uploaded logo.
  const original = data.settings?.original ?? {};
  for (const [key, value] of Object.entries(original)) {
    if (value === null) {
      // The seeded logo setting is JSON null, not SQL null. Removing the row
      // restores the same public behaviour without violating NOT NULL.
      const { error } = await admin.from("store_settings").delete().eq("key", key);
      if (error) throw error;
      continue;
    }
    const { error } = await admin.from("store_settings").upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );
    if (error) throw error;
  }
  removed.settings = Object.keys(original).length;

  if (ids.uploadedLogoPath) {
    const { error } = await admin.storage
      .from("store-assets")
      .remove([ids.uploadedLogoPath]);
    if (error) throw error;
    removed.logo = 1;
  }

  // Child rows first where a foreign key would otherwise retain a parent.
  removed.enquiries = await deleteWhere(admin, "enquiries", "id", ids.enquiryIds ?? []);
  removed.reviews = await deleteWhere(admin, "product_reviews", "id", ids.reviewIds ?? []);
  removed.orders = await deleteWhere(admin, "orders", "id", ids.orderIds ?? []);
  removed.inventoryChanges = await deleteWhere(
    admin,
    "inventory_changes",
    "product_id",
    ids.productIds ?? [],
  );
  removed.coupons = await deleteWhere(admin, "coupons", "id", ids.couponIds ?? []);
  removed.products = await deleteWhere(admin, "products", "id", ids.productIds ?? []);
  removed.categories = await deleteWhere(admin, "categories", "id", ids.categoryIds ?? []);
  removed.brands = await deleteWhere(admin, "brands", "id", ids.brandIds ?? []);

  for (const userId of ids.userIds ?? []) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error && !/not found|Unable to find user/i.test(error.message)) throw error;
  }
  removed.users = (ids.userIds ?? []).length;

  return removed;
}
