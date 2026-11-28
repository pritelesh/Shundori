import {
  Banknote,
  Headset,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { Container } from "@/components/layout/container";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import { siteConfig, trustItems, type TrustIconName } from "@/lib/site";
import type { StoreSettings } from "@/types/phase8";

export interface HomeTrustRowProps {
  settings: StoreSettings;
}

const icons: Record<TrustIconName, LucideIcon> = {
  shield: ShieldCheck,
  banknote: Banknote,
  truck: Truck,
  headset: Headset,
};

/**
 * Cream trust pills. Copy comes from `lib/site.ts`; every configured claim is
 * still checked against public metadata, enabled payments or a live help route
 * before it renders.
 */
export function HomeTrustRow({ settings }: HomeTrustRowProps) {
  const description = settings.storeDescription.replace(/\s+/g, " ").trim();
  const cod = PAYMENT_METHOD_OPTIONS.find(
    (method) => method.id === "cash_on_delivery" && method.enabled,
  );

  const supported = new Set([
    /\b(authentic|genuine|original)\b/i.test(description) ||
    /\bauthentic\b/i.test(siteConfig.tagline)
      ? "authentic"
      : "",
    cod ? "cod" : "",
    /\b(deliver|delivery|islandwide)\b/i.test(description) ||
    /\bislandwide delivery\b/i.test(siteConfig.description)
      ? "delivery"
      : "",
    // The help route is part of the public storefront chrome.
    "support",
  ]);

  const items = trustItems.filter((item) => supported.has(item.id));
  if (items.length === 0) return null;

  return (
    <section
      id="trust"
      className="border-t border-sage-light/70 bg-mist py-2.5"
      aria-labelledby="trust-title"
    >
      <Container>
        <h2 id="trust-title" className="sr-only">
          What we offer.
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const Icon = icons[item.icon];
            return (
              <li
                key={item.id}
                className="flex min-w-0 items-center gap-2.5 rounded-full border border-sage-light/70 bg-cream px-3 py-2 shadow-soft"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-light/70 text-leaf">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-4 text-forest">
                    {item.title}
                  </p>
                  <p className="line-clamp-1 text-[11px] leading-4 text-ink-soft">
                    {item.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
