import "server-only";

/**
 * Server-only environment variables.
 *
 * Never import this module from a Client Component. The `server-only` package
 * turns an accidental client import into a build-time error.
 */

export interface SupabaseServiceRoleEnv {
  url: string;
  serviceRoleKey: string;
}

export function getSupabaseServiceRoleEnv(): SupabaseServiceRoleEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase admin access is not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local. See .env.example.",
    );
  }

  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY must never be exposed with a NEXT_PUBLIC_ prefix. Remove the public variable and keep the key server-only.",
    );
  }

  return { url, serviceRoleKey };
}
