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
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-ink-soft focus:px-5 focus:py-2.5 focus:text-sm focus:font-medium focus:text-cream"
        >
          Skip to content
        </a>
        <Suspense fallback={<HeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <div className="flex flex-1 flex-col pb-[calc(env(safe-area-inset-bottom)_+_4.5rem)] md:pb-0">
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Suspense fallback={null}>
            <SiteFooter />
          </Suspense>
        </div>
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
      <div className="h-7 bg-forest-soft" />
      <div className="border-b border-sage-light/80 bg-mist/90 backdrop-blur-[2px]">
        <Container className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:h-20">
          <div className="h-8 w-24 rounded bg-sage-light/60" />
          <div className="mx-auto hidden h-9 w-96 rounded-full bg-sage-light/60 lg:block" />
          <div className="flex items-center gap-2">
            <div className="size-11 rounded-full bg-sage-light/60" />
            <div className="size-11 rounded-full bg-sage-light/60" />
            <div className="hidden h-9 w-16 rounded-full bg-sage-light/60 sm:block" />
          </div>
        </Container>
      </div>
    </div>
  );
}
