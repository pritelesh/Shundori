import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/lib/env/public";

/**
 * Creates a Supabase client bound to the current request's cookies.
 *
 * Always create a new client per request. Do not cache it in a module-level
 * variable, because that would leak one user's session into another request.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabasePublicEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot write cookies. Session refresh happens in
          // proxy.ts; Route Handlers and Server Actions may set them directly.
        }
      },
    },
  });
}
