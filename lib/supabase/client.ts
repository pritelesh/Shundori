"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "@/lib/env/public";

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient>;

let browserClient: BrowserSupabaseClient | undefined;

/**
 * Returns a singleton Supabase client for the browser.
 *
 * Use this from Client Components only. Server Components, Server Actions and
 * Route Handlers should use `createServerSupabaseClient` instead.
 */
export function createBrowserSupabaseClient(): BrowserSupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { url, anonKey } = getSupabasePublicEnv();
  browserClient = createBrowserClient(url, anonKey);

  return browserClient;
}
