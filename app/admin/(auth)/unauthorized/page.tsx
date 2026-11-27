import { ArrowLeft, LockKeyhole } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonStyles } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Admin access denied",
  robots: { index: false, follow: false },
};

export default function AdminUnauthorizedPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-peach px-5 py-16">
      <div className="w-full max-w-lg rounded-3xl border border-warm-line bg-warm-white p-9 text-center shadow-soft">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-soft-cream text-dark-text">
          <LockKeyhole className="size-6" aria-hidden="true" />
        </span>
        <h1 className="mt-6 font-display text-3xl text-dark-text">
          Admin access required
        </h1>
        <p className="mt-3 text-sm leading-7 text-taupe">
          This account does not have the admin or staff role. If you believe
          this is a mistake, ask an administrator to update your profile in
          Supabase.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/admin/login" className={buttonStyles()}>
            Switch account
          </Link>
          <Link href="/" className={buttonStyles({ variant: "outline" })}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return to store
          </Link>
        </div>
      </div>
    </main>
  );
}
