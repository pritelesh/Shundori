"use client";

import {
  Heart,
  Home,
  LayoutGrid,
  MessageCircle,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils/cn";

import { Localized } from "./localized";

export interface MobileBottomNavProps {
  cartCount: number;
  wishlistCount: number;
  helpUrl: string;
  helpLabel: { en: string; bn: string };
  helpAriaLabel: string;
  onCategories: () => void;
}

function tabClass(active: boolean): string {
  return cn(
    "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors",
    active ? "text-forest" : "text-leaf hover:text-forest",
  );
}

/**
 * Five-tab mobile navigation. The bar sits above the safe area and the shell
 * reserves matching page padding so content is never hidden behind it.
 */
export function MobileBottomNav({
  cartCount,
  wishlistCount,
  helpUrl,
  helpLabel,
  helpAriaLabel,
  onCategories,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const helpIsExternal = /^https?:\/\//.test(helpUrl);

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-sage-light bg-cream pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        <li>
          <Link
            href="/"
            aria-label="Home"
            aria-current={pathname === "/" ? "page" : undefined}
            className={tabClass(pathname === "/")}
          >
            <Home className="size-5" aria-hidden="true" />
            <Localized en="Home" bn="হোম" />
          </Link>
        </li>
        <li>
          <button
            type="button"
            onClick={onCategories}
            aria-label="Browse categories"
            className={tabClass(false)}
          >
            <LayoutGrid className="size-5" aria-hidden="true" />
            <Localized en="Categories" bn="বিভাগ" />
          </button>
        </li>
        <li>
          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} ${wishlistCount === 1 ? "item" : "items"}`}
            aria-current={pathname === "/wishlist" ? "page" : undefined}
            className={tabClass(pathname === "/wishlist")}
          >
            <span className="relative flex items-center justify-center">
              <Heart className="size-5" aria-hidden="true" />
              {wishlistCount > 0 ? (
                <span className="absolute -right-2 -top-2 size-2 rounded-full bg-forest-soft" />
              ) : null}
            </span>
            <Localized en="Wishlist" bn="পছন্দ" />
          </Link>
        </li>
        <li>
          <Link
            href="/cart"
            aria-current={pathname === "/cart" ? "page" : undefined}
            className={tabClass(pathname === "/cart")}
          >
            <span className="relative flex items-center justify-center">
              <ShoppingBag className="size-5" aria-hidden="true" />
              <span className="absolute -right-2.5 -top-2.5 flex min-w-4 items-center justify-center rounded-full bg-lime px-1 text-xs font-semibold leading-4 text-forest">
                {cartCount}
              </span>
            </span>
            <Localized en="Bag" bn="ব্যাগ" />
          </Link>
        </li>
        <li>
          <Link
            href={helpUrl}
            target={helpIsExternal ? "_blank" : undefined}
            rel={helpIsExternal ? "noopener noreferrer" : undefined}
            aria-label={helpAriaLabel}
            className={tabClass(false)}
          >
            <MessageCircle className="size-5" aria-hidden="true" />
            <Localized en={helpLabel.en} bn={helpLabel.bn} />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
