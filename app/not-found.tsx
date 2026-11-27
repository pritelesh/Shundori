import Link from "next/link";

import { Container } from "@/components/layout/container";
import { StorefrontShell } from "@/components/layout/storefront-shell";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StorefrontShell>
      <section className="relative overflow-hidden">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-chocolate/15 blur-3xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 bottom-0 size-64 rounded-full bg-olive/10 blur-3xl"
        />

        <Container className="relative flex min-h-[62vh] flex-col items-center justify-center py-20 text-center sm:py-24">
          <p className="font-display text-6xl leading-none text-olive-deep sm:text-7xl">
            404
          </p>
          <h1 className="mt-6 max-w-xl font-display text-3xl leading-tight text-dark-text sm:text-4xl">
            This page is not in the collection.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-taupe">
            The page you are looking for may have moved, or it has not launched
            yet. Let&apos;s take you somewhere beautiful.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className={buttonStyles()}>
              Return home
            </Link>
            <Link
              href="/#bestsellers"
              className={buttonStyles({ variant: "secondary" })}
            >
              Shop the edit
            </Link>
          </div>
        </Container>
      </section>
    </StorefrontShell>
  );
}
