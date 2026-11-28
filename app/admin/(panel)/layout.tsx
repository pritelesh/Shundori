import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminAccess } from "@/services/admin-auth";

// Admin pages are request-authenticated by design. They still stream behind a
// Suspense boundary, but opt out of static-shell validation because the shell
// itself cannot exist for an unauthenticated visitor.
export const instant = false;

function AdminLoading() {
  return (
    <div className="min-h-screen bg-mist">
      <div className="h-16 border-b border-sage-light bg-cream" />
      <div className="mx-auto max-w-[1400px] animate-pulse px-8 py-10">
        <div className="h-9 w-56 rounded bg-sage-light" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 surface-card rounded-2xl"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

async function AdminGate({ children }: { children: ReactNode }) {
  // Supabase Auth compares token expiry with the current time while restoring
  // the session. Defer that work to the request inside this Suspense boundary
  // so it cannot run during prerendering.
  await connection();
  const access = await getAdminAccess();

  if (access.state === "unauthenticated") {
    redirect("/admin/login");
  }
  if (access.state === "forbidden") {
    redirect("/admin/unauthorized");
  }
  if (access.state === "unconfigured") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-mist px-5 py-16">
        <div className="w-full max-w-xl surface-card rounded-3xl p-9">
          <h1 className="font-display text-3xl text-forest">
            Admin dashboard is not configured
          </h1>
          <p className="mt-4 text-sm leading-7 text-ink-soft">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code>.env.local</code>, apply the SQL migrations, then restart the
            development server.
          </p>
        </div>
      </main>
    );
  }

  return <AdminShell identity={access.identity}>{children}</AdminShell>;
}

export default function AdminPanelLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
