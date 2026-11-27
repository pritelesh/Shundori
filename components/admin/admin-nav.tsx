"use client";

import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Mail,
  PackageSearch,
  Percent,
  Settings2,
  Star,
  Tags,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils/cn";

const links = [
  { href: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/products", label: "Products", icon: PackageSearch },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/brands", label: "Brands", icon: Tags },
  { href: "/admin/categories", label: "Categories", icon: Boxes },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/coupons", label: "Coupons", icon: Percent },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/enquiries", label: "Enquiries", icon: Mail },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings2 },
] as const;

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin navigation"
      className={cn(
        mobile ? "flex gap-1 overflow-x-auto pb-1" : "flex flex-col gap-1",
      )}
    >
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-emerald text-white"
                : "text-muted hover:bg-pink-tint hover:text-charcoal",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
