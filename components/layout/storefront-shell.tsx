import { Suspense, type ReactNode } from "react";

import { PreviewStoreProvider } from "@/components/providers/preview-store";
import { ToastProvider } from "@/components/ui/toast";
import { WishlistSync } from "@/components/wishlist/wishlist-sync";

import { Container } from "./container";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { WhatsAppButton } from "./whatsapp-button";

/**
 * Shared storefront chrome. Used by the storefront layout and by the global
 * 404 page, which sits outside that layout and therefore needs its providers.
 */
export function StorefrontShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ToastProvider>
      <PreviewStoreProvider>
        <Suspense fallback={null}>
          <WishlistSync />
        </Suspense>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-dark-text focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to content
        </a>
        <Suspense fallback={<HeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
        <Suspense fallback={null}>
          <WhatsAppButton />
        </Suspense>
      </PreviewStoreProvider>
    </ToastProvider>
  );
}

function HeaderFallback() {
  return (
    <div aria-hidden="true">
      <div className="h-9 bg-olive" />
      <div className="border-b border-warm-line/80 bg-peach">
        <Container className="flex h-16 items-center justify-between lg:h-20">
          <div className="h-8 w-28 rounded bg-warm-line/60" />
          <div className="hidden h-8 w-72 rounded bg-warm-line/60 lg:block" />
          <div className="h-8 w-24 rounded bg-warm-line/60" />
        </Container>
      </div>
    </div>
  );
}
