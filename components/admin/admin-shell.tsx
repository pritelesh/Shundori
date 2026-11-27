import { ArrowUpRight, LogOut, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { adminLogoutAction } from "@/app/admin/(auth)/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import type { AdminIdentity } from "@/services/admin-auth";

export function AdminShell({
  identity,
  children,
}: Readonly<{ identity: AdminIdentity; children: ReactNode }>) {
  const displayName =
    identity.profile.full_name || identity.user.email?.split("@")[0] || "Admin";

  return (
    <div className="min-h-screen bg-cream">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-cream-soft px-4 py-6 lg:flex">
          <Link href="/admin/dashboard" className="px-3">
            <span className="font-display text-2xl tracking-[0.18em] text-emerald">
              Shundori
            </span>
            <span className="mt-1 block text-[10px] font-medium uppercase tracking-[0.24em] text-muted">
              Admin console
            </span>
          </Link>

          <div className="mt-10">
            <AdminNav />
          </div>

          <div className="mt-auto space-y-3 px-3">
            <div className="rounded-xl border border-line bg-white p-3">
              <p className="flex items-center gap-2 text-xs font-medium text-emerald">
                <ShieldCheck className="size-3.5" aria-hidden="true" />
                Verified session
              </p>
              <p className="mt-1 truncate text-xs text-muted">
                {identity.profile.role}
              </p>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 px-1 text-xs font-medium text-muted transition-colors hover:text-emerald"
            >
              View storefront
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-cream-soft/95 backdrop-blur">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-3 lg:px-8">
              <div>
                <Link
                  href="/admin/dashboard"
                  className="font-display text-xl tracking-[0.16em] text-emerald lg:hidden"
                >
                  Shundori
                </Link>
                <p className="hidden text-sm text-muted lg:block">
                  Signed in as{" "}
                  <span className="font-medium text-charcoal">{displayName}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium text-muted transition-colors hover:bg-pink-tint hover:text-charcoal sm:inline-flex"
                >
                  Storefront
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
                <form action={adminLogoutAction}>
                  <Button type="submit" variant="outline" size="sm">
                    <LogOut className="size-3.5" aria-hidden="true" />
                    Logout
                  </Button>
                </form>
              </div>
            </div>
            <div className="border-t border-line/70 px-5 py-2 lg:hidden">
              <div className="mx-auto max-w-[1400px]">
                <AdminNav mobile />
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-7 lg:px-8 lg:py-10">
            <ToastProvider>{children}</ToastProvider>
          </main>
        </div>
      </div>
    </div>
  );
}
