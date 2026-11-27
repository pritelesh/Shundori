import "server-only";

import type { User } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ProfileRole, ProfileRow } from "@/types/database";

export class AuthorizationError extends Error {
  readonly status: 401 | 403;

  constructor(
    message = "You do not have permission to perform this action.",
    status: 401 | 403 = 403,
  ) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

/** Verifies the cookie-bound session on the server; never trusts client role claims. */
export async function getAuthenticatedUser(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthorizationError("Sign in to continue.", 401);
  }

  return user;
}

export async function getCurrentRole(): Promise<ProfileRole> {
  const user = await getAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<Pick<ProfileRow, "role">>();

  if (error || !data) {
    throw new AuthorizationError("No profile is available for this account.");
  }

  return data.role;
}

/**
 * Server-side admin guard for every privileged service operation.
 *
 * RLS policies enforce the same rule in the database; this check means a
 * broken policy alone cannot grant admin access through application code.
 */
export async function requireAdmin(): Promise<{
  user: User;
  profile: ProfileRow;
}> {
  const user = await getAuthenticatedUser();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  if (error || !data) {
    throw new AuthorizationError("No profile is available for this account.");
  }

  if (data.role !== "admin" && data.role !== "staff") {
    throw new AuthorizationError("Admin access is required.");
  }

  return { user, profile: data };
}
