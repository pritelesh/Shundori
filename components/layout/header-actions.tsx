"use client";

import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useLocale } from "@/components/providers/language-provider";
import { usePreviewStore } from "@/components/providers/preview-store";
import { useToast } from "@/components/ui/toast";
import type { SearchSuggestion } from "@/lib/catalog-search";
import type { CatalogCategory } from "@/types/product";
import { cn } from "@/utils/cn";

import { LanguageToggle } from "./language-toggle";
import { MobileBottomNav } from "./mobile-bottom-nav";
import { MobileMenu } from "./mobile-menu";
import { NavigationMenu } from "./navigation-menu";
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

export interface HeaderActionsProps {
  logo: ReactNode;
  searchIndex: readonly SearchSuggestion[];
  categories: readonly CatalogCategory[];
  helpUrl: string;
  helpLabel: { en: string; bn: string };
  helpAriaLabel: string;
}

/**
 * Interactive header cluster. The surrounding header chrome stays a Server
 * Component; stateful search, menus, counts and the bottom bar live here.
 */
export function HeaderActions({
  logo,
  searchIndex,
  categories,
  helpUrl,
  helpLabel,
  helpAriaLabel,
}: HeaderActionsProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [inlineSearchOpen, setInlineSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const inlineSearchRef = useRef<HTMLInputElement>(null);
  const { locale } = useLocale();
  const { cartCount, wishlist } = usePreviewStore();
  const mounted = useSyncExternalStore(
    subscribeToMount,
    readMount,
    readServerMount,
  );
  // Saved bag and wishlist data only exist in localStorage. Keep the first
  // client render identical to the server render, then reveal hydrated counts.
  const visibleCartCount = mounted ? cartCount : 0;
  const visibleWishlistCount = mounted ? wishlist.size : 0;
  const { toast } = useToast();

  useEffect(() => {
    if (inlineSearchOpen) inlineSearchRef.current?.focus();
  }, [inlineSearchOpen]);

  const showAccountNotice = () => {
    toast({
      title: "Account area opens at launch",
      description: "Sign-in and order history arrive with the store.",
      variant: "info",
    });
  };

  const openMenu = () => {
    setCategoriesOpen(false);
    setInlineSearchOpen(false);
    setMenuOpen(true);
  };

  const openCategories = () => {
    setMenuOpen(false);
    setInlineSearchOpen(false);
    setCategoriesOpen(true);
  };

  const openSearchDialog = () => {
    setMenuOpen(false);
    setCategoriesOpen(false);
    setInlineSearchOpen(false);
    setSearchOpen(true);
  };

  const toggleSearch = () => {
    setMenuOpen(false);
    setCategoriesOpen(false);
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      setInlineSearchOpen((open) => !open);
      return;
    }
    setSearchOpen(true);
  };

  const iconButtonClass = cn(
    "relative inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-sage-light/70 bg-cream/70 text-ink-soft transition-colors hover:bg-cream hover:text-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40",
  );
  const searchPlaceholder =
    locale === "bn" ? "পণ্য খুঁজুন" : "Search products";

  return (
    <>
      <div className="grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:h-20">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={openMenu}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className={cn(iconButtonClass, "md:hidden")}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <div className="shrink-0">{logo}</div>
        </div>

        <NavigationMenu
          className={cn(
            "hidden justify-center lg:flex",
            inlineSearchOpen && "lg:hidden",
          )}
        />

        <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2">
          <form
            id="inline-search"
            action="/search"
            method="get"
            className={cn(
              "hidden w-48 items-center gap-1 rounded-full border border-sage-light/70 bg-cream py-1 pl-3 pr-1 shadow-soft",
              inlineSearchOpen && "lg:flex",
            )}
          >
            <Search className="size-4 shrink-0 text-leaf" aria-hidden="true" />
            <input
              ref={inlineSearchRef}
              name="q"
              type="search"
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-sm text-forest outline-none placeholder:text-ink-soft"
            />
            <button
              type="button"
              onClick={() => setInlineSearchOpen(false)}
              aria-label="Close inline search"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sage-light/70 hover:text-forest"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </form>

          <button
            type="button"
            onClick={toggleSearch}
            aria-label={inlineSearchOpen ? "Close inline search" : "Search products"}
            aria-expanded={inlineSearchOpen}
            aria-controls="inline-search"
            className={iconButtonClass}
          >
            <Search className="size-5" aria-hidden="true" />
          </button>

          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${visibleWishlistCount} ${visibleWishlistCount === 1 ? "item" : "items"}`}
            className={cn(iconButtonClass, "hidden sm:inline-flex")}
          >
            <Heart className="size-5" aria-hidden="true" />
            {visibleWishlistCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-sage-light px-1 text-[11px] font-semibold leading-4 text-forest">
                {visibleWishlistCount}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            onClick={showAccountNotice}
            aria-label="Account"
            className={cn(iconButtonClass, "hidden md:inline-flex")}
          >
            <User className="size-5" aria-hidden="true" />
          </button>

          <Link
            href="/cart"
            aria-label={`Shopping bag, ${visibleCartCount} ${visibleCartCount === 1 ? "item" : "items"}`}
            className={iconButtonClass}
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            <span className="absolute right-0 top-0 flex min-w-4 items-center justify-center rounded-full bg-lime px-1 text-[11px] font-semibold leading-4 text-forest">
              {visibleCartCount}
            </span>
          </Link>

          <LanguageToggle className="hidden sm:inline-flex" />
        </div>
      </div>

      <SearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        index={searchIndex}
      />

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onSearch={openSearchDialog}
        onAccount={showAccountNotice}
        cartCount={visibleCartCount}
        wishlistCount={visibleWishlistCount}
        categories={categories}
        categoriesOpen={categoriesOpen}
        onCategoriesOpen={openCategories}
        onCategoriesClose={() => setCategoriesOpen(false)}
      />

      <MobileBottomNav
        cartCount={visibleCartCount}
        wishlistCount={visibleWishlistCount}
        helpUrl={helpUrl}
        helpLabel={helpLabel}
        helpAriaLabel={helpAriaLabel}
        onCategories={openCategories}
      />
    </>
  );
}
