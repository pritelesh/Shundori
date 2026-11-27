import "server-only";

import { getAuthenticatedUser, requireAdmin } from "@/services/authorization";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/types/database";
import type { CustomerProfile } from "@/types/customer";

function toCustomerProfile(row: ProfileRow): CustomerProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    role: row.role,
    // Addresses are captured on orders in Phase 4; profile delivery defaults
    // are part of the later checkout work.
    defaultAddress: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Reads the signed-in customer's own profile under RLS. */
export async function getCurrentProfile(): Promise<CustomerProfile | null> {
  const user = await getAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error) throw error;

  return data ? toCustomerProfile(data) : null;
}

export interface UpdateProfileInput {
  fullName: string;
  phone: string | null;
}

/** Customers can edit contact details, never their role or another profile. */
export async function updateCurrentProfile(
  input: UpdateProfileInput,
): Promise<CustomerProfile> {
  const fullName = input.fullName.trim();
  const phone = input.phone?.trim() || null;

  if (!fullName) throw new Error("Full name is required.");
  if (phone && phone.length > 40) {
    throw new Error("Phone number is too long.");
  }

  const user = await getAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone, email: user.email ?? "" })
    .eq("id", user.id)
    .select("*")
    .single<ProfileRow>();

  if (error) throw error;

  return toCustomerProfile(data);
}

/** Admin-only directory read. The role is checked on the server before querying. */
export async function listProfilesForAdmin(): Promise<CustomerProfile[]> {
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data as ProfileRow[]).map(toCustomerProfile);
}
