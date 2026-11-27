import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabasePublicEnv, hasSupabasePublicEnv } from "@/lib/env/public";

/**
 * Refreshes Supabase Auth cookies before rendering.
 *
 * This is session maintenance only; authorization is always re-checked in
 * Server Components and services with `getUser()` and a role lookup. When
 * credentials are absent the local demonstration catalogue runs unchanged.
 */
function applyConfirmationHeaders(response: NextResponse, request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/order-success/")) return response;

  // The URL itself is a bearer secret for one customer's order. Keep it out of
  // outbound referrers and stop shared caches from retaining the PII response.
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function proxy(request: NextRequest) {
  let response = applyConfirmationHeaders(NextResponse.next({ request }), request);

  if (!hasSupabasePublicEnv()) {
    return response;
  }

  const { url, anonKey } = getSupabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = applyConfirmationHeaders(NextResponse.next({ request }), request);

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Calling getUser() triggers token refresh and cookie writes when needed.
  await supabase.auth.getUser();

  return applyConfirmationHeaders(response, request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
