import "server-only";

import { assertUuid, ValidationError } from "@/lib/admin-validation";
import { hasSupabasePublicEnv } from "@/lib/env/public";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { requireAdmin } from "@/services/authorization";
import type {
  Coupon,
  CouponDiscountType,
  CouponInput,
  CouponValidation,
} from "@/types/phase8";

interface CouponRow {
  id: string;
  code: string;
  discount_type: CouponDiscountType;
  discount_value: number;
  minimum_subtotal_poisha: number;
  maximum_discount_poisha: number | null;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  redemptions_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CouponValidationRow {
  ok?: unknown;
  code?: unknown;
  discount?: unknown;
  message?: unknown;
}

function toPoisha(taka: number): number {
  return Math.round(taka * 100);
}

function mapCoupon(row: CouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    minimumSubtotal: row.minimum_subtotal_poisha,
    maximumDiscount: row.maximum_discount_poisha,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    usageLimit: row.usage_limit,
    redemptionsCount: row.redemptions_count,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function validateInput(input: CouponInput): void {
  const errors: Record<string, string> = {};
  const code = input.code.trim().toUpperCase();

  if (!/^[A-Z0-9][A-Z0-9_-]{2,29}$/.test(code)) {
    errors.code = "Use 3–30 letters, numbers, hyphens or underscores.";
  }
  if (input.discountType !== "percentage" && input.discountType !== "fixed") {
    errors.discountType = "Choose percentage or fixed amount.";
  }

  if (input.discountType === "percentage") {
    if (
      typeof input.percentage !== "number" ||
      !Number.isFinite(input.percentage) ||
      input.percentage <= 0 ||
      input.percentage > 100 ||
      Math.round(input.percentage * 100) !== input.percentage * 100
    ) {
      errors.percentage = "Enter a percentage from 0.01 to 100.";
    }
  } else if (
    typeof input.fixedAmountTaka !== "number" ||
    !Number.isFinite(input.fixedAmountTaka) ||
    input.fixedAmountTaka <= 0 ||
    Math.abs(input.fixedAmountTaka * 100 - toPoisha(input.fixedAmountTaka)) > 1e-6
  ) {
    errors.fixedAmountTaka = "Enter a fixed amount up to two decimal places.";
  }

  if (
    !Number.isFinite(input.minimumOrderTaka) ||
    input.minimumOrderTaka < 0 ||
    Math.abs(input.minimumOrderTaka * 100 - toPoisha(input.minimumOrderTaka)) > 1e-6
  ) {
    errors.minimumOrderTaka = "Enter a valid minimum order amount.";
  }
  if (
    input.maximumDiscountTaka !== null &&
    (!Number.isFinite(input.maximumDiscountTaka) ||
      input.maximumDiscountTaka < 0)
  ) {
    errors.maximumDiscountTaka = "Enter a valid maximum discount or leave it blank.";
  }

  const starts = input.startsAt ? Date.parse(input.startsAt) : null;
  const ends = input.endsAt ? Date.parse(input.endsAt) : null;
  if (input.startsAt && (starts === null || !Number.isFinite(starts))) {
    errors.startsAt = "Enter a valid start date.";
  }
  if (input.endsAt && (ends === null || !Number.isFinite(ends))) {
    errors.endsAt = "Enter a valid end date.";
  }
  if (
    starts !== null &&
    ends !== null &&
    Number.isFinite(starts) &&
    Number.isFinite(ends) &&
    starts >= ends
  ) {
    errors.endsAt = "The end date must be after the start date.";
  }
  if (
    input.usageLimit !== null &&
    (!Number.isSafeInteger(input.usageLimit) || input.usageLimit <= 0)
  ) {
    errors.usageLimit = "Enter a usage limit of at least 1 or leave it blank.";
  }

  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
}

function toRowValues(input: CouponInput) {
  return {
    code: input.code.trim().toUpperCase(),
    discount_type: input.discountType,
    discount_value:
      input.discountType === "percentage"
        ? Math.round((input.percentage ?? 0) * 100)
        : toPoisha(input.fixedAmountTaka ?? 0),
    minimum_subtotal_poisha: toPoisha(input.minimumOrderTaka),
    maximum_discount_poisha:
      input.maximumDiscountTaka === null
        ? null
        : toPoisha(input.maximumDiscountTaka),
    starts_at: input.startsAt ? new Date(input.startsAt).toISOString() : null,
    ends_at: input.endsAt ? new Date(input.endsAt).toISOString() : null,
    usage_limit: input.usageLimit,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  };
}

export async function listAdminCoupons(): Promise<Coupon[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as CouponRow[]).map(mapCoupon);
}

export async function createAdminCoupon(input: CouponInput): Promise<Coupon> {
  validateInput(input);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("coupons")
    .insert(toRowValues(input))
    .select("*")
    .single<CouponRow>();

  if (error) throw error;
  return mapCoupon(data);
}

export async function updateAdminCoupon(
  id: string,
  input: CouponInput,
): Promise<Coupon> {
  assertUuid(id, "couponId");
  validateInput(input);
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("coupons")
    .update(toRowValues(input))
    .eq("id", id)
    .select("*")
    .single<CouponRow>();

  if (error) throw error;
  return mapCoupon(data);
}

export async function deleteAdminCoupon(id: string): Promise<void> {
  assertUuid(id, "couponId");
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("coupons").delete().eq("id", id);
  if (error) throw error;
}

/** Public validation used by the checkout quote; placement revalidates atomically. */
export async function validateCouponForSubtotal(
  code: string,
  subtotal: number,
): Promise<CouponValidation> {
  if (!hasSupabasePublicEnv()) {
    return { ok: false, code: null, discount: 0, message: "Coupons are unavailable." };
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("validate_coupon", {
    p_code: code,
    p_subtotal: subtotal,
  });
  if (error) throw error;

  const row = (data ?? {}) as CouponValidationRow;
  return {
    ok: row.ok === true,
    code: typeof row.code === "string" ? row.code : null,
    discount:
      typeof row.discount === "number" && Number.isInteger(row.discount)
        ? row.discount
        : 0,
    message: typeof row.message === "string" ? row.message : null,
  };
}
