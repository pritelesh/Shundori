"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils/cn";

import { Localized } from "./localized";

export const categoriesHref = "/#categories";

/** Full mobile-menu destinations, including the sections outside the pill. */
export const primaryNavigation = [
  { label: "Home", bn: "হোম", href: "/" },
  { label: "Shop", bn: "শপ", href: "/shop" },
  { label: "Categories", bn: "বিভাগ", href: categoriesHref },
  { label: "Brands", bn: "ব্র্যান্ড", href: "/#brands" },
  { label: "About Us", bn: "আমাদের সম্পর্কে", href: "/about" },
  { label: "Contact", bn: "যোগাযোগ", href: "/contact" },
] as const;

/** The six destinations shown in the floating desktop pill. */
const headerNavigation = [
  { label: "Shop", bn: "শপ", href: "/shop" },
  { label: "Offers", bn: "অফার", href: "/shop?sort=price-desc" },
  { label: "Skincare", bn: "স্কিনকেয়ার", href: "/category/skincare" },
  { label: "Makeup", bn: "মেকআপ", href: "/category/makeup" },
  { label: "Haircare", bn: "হেয়ারকেয়ার", href: "/category/haircare" },
  { label: "Body Care", bn: "বডি কেয়ার", href: "/category/body-care" },
] as const;

export interface NavigationMenuProps {
  className?: string;
}

export function NavigationMenu({ className }: NavigationMenuProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/shop") {
      return (
        pathname === "/shop" ||
        pathname.startsWith("/product") ||
        pathname.startsWith("/brand") ||
        pathname.startsWith("/search")
      );
    }
    if (href.startsWith("/category/")) {
      return pathname.startsWith(href);
    }
    return pathname === href;
  };

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "items-center gap-1 rounded-full border border-sage-light/70 bg-cream p-1 shadow-soft",
        className,
      )}
    >
      {headerNavigation.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40",
              active
                ? "bg-forest text-cream"
                : "text-leaf hover:bg-sage-light/60 hover:text-forest",
            )}
          >
            <Localized en={item.label} bn={item.bn} />
          </Link>
        );
      })}
    </nav>
  );
}
