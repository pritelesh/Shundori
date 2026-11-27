import Link from "next/link";

import { cn } from "@/utils/cn";

export const primaryNavigation = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Categories", href: "/#categories" },
  { label: "Brands", href: "/#brands" },
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;

export interface NavigationMenuProps {
  className?: string;
}

export function NavigationMenu({ className }: NavigationMenuProps) {
  return (
    <nav aria-label="Primary" className={cn("items-center gap-7", className)}>
      {primaryNavigation.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="group relative py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-charcoal/75 transition-colors hover:text-charcoal"
        >
          {item.label}
          <span
            aria-hidden="true"
            className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-pink transition-transform duration-300 group-hover:scale-x-100"
          />
        </Link>
      ))}
    </nav>
  );
}
