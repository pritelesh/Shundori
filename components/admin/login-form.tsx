"use client";

import { LockKeyhole, Mail } from "lucide-react";
import { useActionState } from "react";

import { adminLoginAction } from "@/app/admin/(auth)/actions";
import { initialLoginState } from "@/app/admin/(auth)/login-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(
    adminLoginAction,
    initialLoginState,
  );

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-medium">
          Email address
        </label>
        <div className="relative">
          <Mail
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-taupe"
            aria-hidden="true"
          />
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            placeholder="admin@shundori.com"
            className="pl-10"
            aria-invalid={Boolean(state.fieldErrors.email)}
          />
        </div>
        {state.fieldErrors.email ? (
          <p className="mt-1.5 text-xs text-chocolate">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-medium">
          Password
        </label>
        <div className="relative">
          <LockKeyhole
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-taupe"
            aria-hidden="true"
          />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pl-10"
          />
        </div>
      </div>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="rounded-lg border border-chocolate/40 bg-soft-cream px-4 py-3 text-sm text-dark-text"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in to dashboard"}
      </Button>

      <p className="text-center text-xs leading-5 text-taupe">
        Only accounts assigned the admin or staff role can sign in. There is no
        public administrator registration.
      </p>
    </form>
  );
}
