import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/lib/env/public";

/**
 * Anonymous server-side Supabase client for public catalogue reads.
 *
 * It does not read request cookies, so public data can be cached and cannot
 * accidentally expose a user's session. Row Level Security is enforced by the
 * anon key. For user-specific reads use `createServerSupabaseClient` instead.
 */
export function createPublicSupabaseClient() {
  const { url, anonKey } = getSupabasePublicEnv();

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
