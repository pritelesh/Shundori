import { Banknote, ShieldCheck, Truck } from "lucide-react";

import { cn } from "@/utils/cn";

const signals = [
  {
    icon: ShieldCheck,
    title: "Authentic products",
    description: "Product and brand details are shown as supplied, without invented claims.",
  },
  {
    icon: Truck,
    title: "Islandwide delivery",
    description: "Delivery is available across Bangladesh with clear order updates.",
  },
  {
    icon: Banknote,
    title: "Cash on delivery",
    description: "Pay in cash when your order arrives.",
  },
] as const;

export interface TrustSignalsProps {
  className?: string;
  variant?: "strip" | "cards";
}

/** Reusable storefront promises: authenticity, delivery and cash on delivery. */
export function TrustSignals({
  className,
  variant = "strip",
}: TrustSignalsProps) {
  if (variant === "cards") {
    return (
      <ul
        className={cn(
          "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
          className,
        )}
      >
        {signals.map(({ icon: Icon, title, description }) => (
          <li
            key={title}
            className="rounded-2xl border border-sage-light/70 bg-sage-light/60 p-6"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-cream text-leaf">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-xl text-forest">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      className={cn(
        "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {signals.map(({ icon: Icon, title, description }) => (
        <li key={title} className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage-light text-leaf">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-ink-soft">{title}</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-soft">{description}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
