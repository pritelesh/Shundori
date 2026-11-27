import type { Address } from "@/types/order";

export type CustomerRole = "customer" | "admin" | "staff";

/**
 * Application-level customer profile.
 *
 * `id` matches the Supabase Auth user id. Authentication credentials are never
 * stored in this table.
 */
export interface CustomerProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: CustomerRole;
  defaultAddress: Address | null;
  createdAt: string;
  updatedAt: string;
}
