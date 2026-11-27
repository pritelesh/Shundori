import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceRoleEnv } from "@/lib/env/server";

/**
 * Creates a Supabase client that bypasses Row Level Security.
 *
 * SECURITY:
 * - Only use this in trusted server code (Server Actions, Route Handlers).
 * - Never import it into a Client Component.
 * - Never prefix the service role key with NEXT_PUBLIC_.
 * - Prefer `createServerSupabaseClient` with RLS for normal user requests.
 */
export function createAdminSupabaseClient() {
  const { url, serviceRoleKey } = getSupabaseServiceRoleEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
