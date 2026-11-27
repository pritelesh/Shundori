import "server-only";

import { ValidationError } from "@/lib/admin-validation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/services/authorization";

const DELIVERY_CHARGE_KEY = "delivery_charge_poisha";
const MAX_DELIVERY_TAKA = 10000;

interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string;
}

function readPoisha(value: unknown): number {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : 0;

  return Number.isInteger(raw) && raw >= 0 && raw <= MAX_DELIVERY_TAKA * 100
    ? raw
    : 0;
}

export async function getAdminDeliveryCharge(): Promise<number> {
  await requireAdmin();

  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("store_settings")
    .select("key, value, updated_at")
    .eq("key", DELIVERY_CHARGE_KEY)
    .maybeSingle<SettingRow>();

  if (error) throw error;
  return readPoisha(data?.value);
}

export async function updateAdminDeliveryCharge(taka: number): Promise<number> {
  await requireAdmin();

  if (
    !Number.isFinite(taka) ||
    taka < 0 ||
    taka > MAX_DELIVERY_TAKA ||
    Math.abs(taka * 100 - Math.round(taka * 100)) > 1e-6
  ) {
    throw new ValidationError({
      deliveryCharge: `Enter an amount between 0 and ${MAX_DELIVERY_TAKA} taka, up to two decimal places.`,
    });
  }

  const poisha = Math.round(taka * 100);
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("store_settings").upsert(
    {
      key: DELIVERY_CHARGE_KEY,
      value: poisha,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) throw error;
  return poisha;
}
