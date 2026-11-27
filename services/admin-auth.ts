import "server-only";

import type { User } from "@supabase/supabase-js";

import { assertEmail, ValidationError } from "@/lib/admin-validation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRole, ProfileRow } from "@/types/database";

export interface AdminIdentity {
  user: User;
  profile: ProfileRow;
}

export type AdminAccessResult =
  | { state: "authorized"; identity: AdminIdentity }
  | { state: "unauthenticated" }
  | { state: "forbidden"; email: string | null }
  | { state: "unconfigured" };

function isPrivileged(role: ProfileRole): boolean {
  return role === "admin" || role === "staff";
}

/**
 * Sign-in for the admin panel only. A valid customer session is signed out
 * immediately so it cannot linger in the browser after a rejected login.
 */
export async function signInAdmin(email: string, password: string): Promise<AdminIdentity> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new ValidationError({
      credentials: "Email and password are required.",
    });
  }
  assertEmail(cleanEmail);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error || !data.user) {
    throw new Error("The email or password is incorrect.");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle<ProfileRow>();

  if (profileError || !profile || !isPrivileged(profile.role)) {
    await supabase.auth.signOut();
    throw new Error("This account is not authorised to use the admin dashboard.");
  }

  return { user: data.user, profile };
}

export async function signOutAdmin(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Single source of truth for route protection. It never throws for an expected
 * auth state so pages can redirect cleanly instead of rendering an error.
 */
export async function getAdminAccess(): Promise<AdminAccessResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return { state: "unauthenticated" };

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle<ProfileRow>();

    if (profileError || !profile) return { state: "unauthenticated" };

    if (!isPrivileged(profile.role)) {
      return { state: "forbidden", email: user.email ?? null };
    }

    return { state: "authorized", identity: { user, profile } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/not configured|env\.local/i.test(message)) {
      return { state: "unconfigured" };
    }
    return { state: "unauthenticated" };
  }
}
