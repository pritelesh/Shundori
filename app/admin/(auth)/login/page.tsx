import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { AdminLoginForm } from "@/components/admin/login-form";
import { getAdminAccess } from "@/services/admin-auth";

// Sign-in checks the current session, so it cannot be a prerendered shell.
export const instant = false;

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

function safeNext(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith("/admin") || candidate.startsWith("//")) {
    return "/admin/dashboard";
  }
  return candidate;
}

async function LoginGate({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  // Supabase Auth compares token expiry with the current time while restoring
  // the session. Defer that work to the request inside this Suspense boundary.
  await connection();

  const params = await searchParams;
  const next = safeNext(params.next);
  const access = await getAdminAccess();
  if (access.state === "authorized") redirect(next);

  return (
    <main className="min-h-dvh bg-mist px-5 py-12 sm:px-8">
      <div className="mx-auto grid w-full max-w-5xl overflow-hidden surface-card rounded-3xl shadow-soft lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-forest p-10 text-cream lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 size-80 rounded-full bg-forest/25 blur-3xl"
          />
          <div className="relative">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-cream/80 transition-colors hover:text-cream"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Back to store
            </Link>
            <span className="mt-16 block font-display text-4xl tracking-[0.08em]">
              Shundori
            </span>
            <h1 className="mt-5 max-w-sm font-display text-3xl leading-tight text-cream">
              The control room for your beauty store.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-7 text-cream/75">
              Manage products, artwork, stock levels and storefront visibility
              from one secure console.
            </p>
          </div>
          <p className="relative flex items-center gap-2 text-xs text-cream/70">
            <ShieldCheck className="size-4" aria-hidden="true" />
            Server-verified admin and staff access only
          </p>
        </div>

        <div className="p-7 sm:p-10 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-forest">
            Restricted area
          </p>
          <h2 className="mt-2 font-display text-3xl text-forest">
            Admin sign in
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            Use the administrator or staff account created in Supabase Auth.
            Customers cannot register here.
          </p>

          {access.state === "unconfigured" ? (
            <p
              role="status"
              className="mt-6 rounded-lg border border-sage-light bg-cream px-4 py-3 text-xs leading-5 text-ink-soft"
            >
              Supabase is not configured. Add the public Supabase URL and anon
              key to <code>.env.local</code> before signing in.
            </p>
          ) : null}

          <AdminLoginForm next={next} />
        </div>
      </div>
    </main>
  );
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  return (
    <Suspense fallback={<main className="min-h-dvh bg-mist" />}>
      <LoginGate searchParams={searchParams} />
    </Suspense>
  );
}
