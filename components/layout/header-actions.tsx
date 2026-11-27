"use client";

import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, useState } from "react";

import { usePreviewStore } from "@/components/providers/preview-store";
import { useToast } from "@/components/ui/toast";
import type { SearchSuggestion } from "@/lib/catalog-search";

import { MobileMenu } from "./mobile-menu";
import { SearchDialog } from "./search-dialog";

const mountListeners = new Set<() => void>();
let mountedInBrowser = false;

function subscribeToMount(listener: () => void): () => void {
  mountListeners.add(listener);
  mountedInBrowser = true;
  // React subscribes after the hydration commit; notify on the next microtask
  // so the first client render still matches the server-rendered HTML.
  Promise.resolve().then(() => {
    for (const notify of mountListeners) notify();
  });
  return () => {
    mountListeners.delete(listener);
  };
}

function readMount(): boolean {
  return mountedInBrowser;
}

function readServerMount(): boolean {
  return false;
}

/**
 * Header action cluster. Search, account and bag are interface previews:
 * no requests are made and no account or order data exists yet.
 */
export function HeaderActions({ searchIndex }: { searchIndex: readonly SearchSuggestion[] }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { cartCount, wishlist } = usePreviewStore();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    readMount,
    readServerMount,
  );
  // The saved bag only exists in localStorage. Keep the first client render
  // identical to the server render, then reveal the hydrated count.
  const visibleCartCount = mounted ? cartCount : 0;
  const visibleWishlistCount = mounted ? wishlist.size : 0;
  const { toast } = useToast();

  const showAccountNotice = () => {
    toast({
      title: "Account area opens at launch",
      description: "Sign-in and order history arrive with the store.",
      variant: "info",
    });
  };

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Search products"
        className="hidden size-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-white sm:inline-flex"
      >
        <Search className="size-5" aria-hidden="true" />
      </button>

      <button
        type="button"
        onClick={showAccountNotice}
        aria-label="Account"
        className="hidden size-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-white lg:inline-flex"
      >
        <User className="size-5" aria-hidden="true" />
      </button>

      <Link
        href="/cart"
        aria-label={`Shopping bag, ${visibleCartCount} ${visibleCartCount === 1 ? "item" : "items"}`}
        className="relative inline-flex size-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-white"
      >
        <ShoppingBag className="size-5" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-emerald px-1 text-[10px] font-semibold leading-4 text-white"
        >
          {visibleCartCount}
        </span>
      </Link>

      <Link
        href="/wishlist"
        aria-label={`Wishlist, ${visibleWishlistCount} ${visibleWishlistCount === 1 ? "item" : "items"}`}
        className="relative hidden size-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-white sm:inline-flex"
      >
        <Heart className="size-5" aria-hidden="true" />
        {visibleWishlistCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-semibold leading-4 text-charcoal"
          >
            {visibleWishlistCount}
          </span>
        ) : null}
      </Link>

      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        className="inline-flex size-10 items-center justify-center rounded-full text-charcoal transition-colors hover:bg-white lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        index={searchIndex}
      />

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearch={() => setSearchOpen(true)}
        onAccount={showAccountNotice}
        cartCount={visibleCartCount}
        wishlistCount={visibleWishlistCount}
      />
    </div>
  );
}
