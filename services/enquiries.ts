import "server-only";

import { assertUuid, ValidationError } from "@/lib/admin-validation";
import { hasSupabasePublicEnv } from "@/lib/env/public";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createPublicSupabaseClient } from "@/lib/supabase/public";
import { requireAdmin } from "@/services/authorization";
import type { Enquiry, EnquirySource } from "@/types/phase8";

interface EnquiryRow {
  id: string;
  source: EnquirySource;
  product_id: string | null;
  order_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  message: string;
  status: "new" | "replied" | "closed";
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

function mapEnquiry(row: EnquiryRow): Enquiry {
  return {
    id: row.id,
    source: row.source,
    productId: row.product_id,
    orderId: row.order_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    message: row.message,
    status: row.status,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface ProductEnquiryInput {
  productId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  message: string;
}

export async function createProductEnquiry(
  input: ProductEnquiryInput,
): Promise<void> {
  assertUuid(input.productId, "productId");
  const errors: Record<string, string> = {};
  if (input.customerName.trim().length < 2 || input.customerName.length > 100) {
    errors.customerName = "Enter your name (2–100 characters).";
  }
  if (input.customerPhone.trim().length < 8 || input.customerPhone.length > 30) {
    errors.customerPhone = "Enter a valid phone number.";
  }
  if (input.message.trim().length < 10 || input.message.length > 2000) {
    errors.message = "Write at least 10 characters.";
  }
  if (
    input.customerEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail)
  ) {
    errors.customerEmail = "Enter a valid email address.";
  }
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  if (!hasSupabasePublicEnv()) {
    throw new Error("Enquiries need Supabase credentials.");
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("create_product_enquiry", {
    p_product_id: input.productId,
    p_customer_name: input.customerName.trim(),
    p_customer_phone: input.customerPhone.trim(),
    p_customer_email: input.customerEmail?.trim() || null,
    p_message: input.message.trim(),
  });
  if (error) throw error;
  if (data?.ok === false) {
    throw new ValidationError({ message: "We could not send your enquiry." });
  }
}

export interface OrderEnquiryInput {
  orderNumber: string;
  customerPhone: string;
  message: string;
}

/**
 * The RPC checks order number + phone together and returns only a generic
 * success value, so this service never reveals another customer's details.
 */
export async function createOrderEnquiry(input: OrderEnquiryInput): Promise<void> {
  const errors: Record<string, string> = {};
  if (!/^SD-\d{8}-[A-Z0-9]{8}$/.test(input.orderNumber.trim().toUpperCase())) {
    errors.orderNumber = "Enter a valid order number.";
  }
  if (input.customerPhone.trim().length < 8) {
    errors.customerPhone = "Enter the phone number used for the order.";
  }
  if (input.message.trim().length < 10 || input.message.length > 2000) {
    errors.message = "Write at least 10 characters.";
  }
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  if (!hasSupabasePublicEnv()) {
    throw new Error("Enquiries need Supabase credentials.");
  }

  const supabase = createPublicSupabaseClient();
  const { data, error } = await supabase.rpc("create_order_enquiry", {
    p_order_number: input.orderNumber.trim().toUpperCase(),
    p_customer_phone: input.customerPhone.trim(),
    p_message: input.message.trim(),
  });
  if (error) {
    throw new ValidationError({
      orderNumber: "Check your order number, phone and message.",
    });
  }
  if (data?.ok === false) {
    throw new ValidationError({
      orderNumber: "Check your order number, phone and message.",
    });
  }
}

export async function listAdminEnquiries(): Promise<Enquiry[]> {
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("enquiries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data as EnquiryRow[]).map(mapEnquiry);
}

export async function updateAdminEnquiry(
  id: string,
  status: Enquiry["status"],
  note: string | null,
): Promise<void> {
  assertUuid(id, "enquiryId");
  if (!["new", "replied", "closed"].includes(status)) {
    throw new ValidationError({ status: "Choose a valid status." });
  }
  await requireAdmin();
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("enquiries")
    .update({ status, admin_note: note?.trim() || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
