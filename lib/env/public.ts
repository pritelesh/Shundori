/**
 * Public environment variables.
 *
 * Only variables prefixed with `NEXT_PUBLIC_` may be read here. This module is
 * safe to import from Client Components.
 */

export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

const SETUP_HINT =
  "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local. See .env.example for the expected format.";

/**
 * True when both public Supabase values are present and non-empty.
 *
 * Pages use this to choose Supabase-backed reads. Missing credentials keep the
 * local demonstration catalogue available without pretending it is live data.
 */
export function hasSupabasePublicEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
  );
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(`Supabase is not configured. ${SETUP_HINT}`);
  }

  try {
    new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL is not a valid URL. ${SETUP_HINT}`,
    );
  }

  return { url, anonKey };
}
