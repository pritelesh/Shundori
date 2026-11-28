import { Banknote, ShieldCheck, Truck } from "lucide-react";

import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import type { CatalogProduct } from "@/types/product";
import type { StoreSettings } from "@/types/phase8";
import { cn } from "@/utils/cn";

export interface ProductInfoChipsProps {
  product: CatalogProduct;
  settings: StoreSettings;
}

const AUTHENTICITY_WORDS = /\b(authentic|genuine|original)\b/i;
const DELIVERY_WORDS = /\b(deliver|delivery|islandwide|shipping)\b/i;
const TIMING_WORDS = /\b\d+\s*(?:-|to|–)?\s*\d*\s*(?:days?|weeks?|hours?)\b/i;

function sentences(value: string): string[] {
  return value
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function findNote(values: readonly string[], pattern: RegExp): string | null {
  for (const value of values) {
    const match = sentences(value).find((sentence) => pattern.test(sentence));
    if (match) return match;
  }
  return null;
}

function Chip({
  icon: Icon,
  label,
  detail,
}: {
  icon: typeof ShieldCheck;
  label: string;
  detail: string;
}) {
  return (
    <span className="inline-flex min-h-11 max-w-full items-start gap-2 rounded-full border border-sage-light bg-cream px-3 py-2 text-xs text-ink-soft">
      <Icon className="mt-0.5 size-4 shrink-0 text-leaf" aria-hidden="true" />
      <span className="min-w-0">
        <span className="font-medium">{label}</span>
        <span className="ml-1.5 line-clamp-2 text-ink-soft">{detail}</span>
      </span>
    </span>
  );
}

/**
 * Small, factual chips. COD comes from the enabled payment registry; delivery
 * and authenticity come from store settings or supplied product data only.
 */
export function ProductInfoChips({ product, settings }: ProductInfoChipsProps) {
  const storeDescription = settings.storeDescription.trim();
  const cod = PAYMENT_METHOD_OPTIONS.find(
    (method) => method.id === "cash_on_delivery" && method.enabled,
  );

  const deliveryNote = findNote(storeDescription ? [storeDescription] : [], DELIVERY_WORDS);
  const timing = deliveryNote?.match(TIMING_WORDS)?.[0] ?? null;

  const authenticityNote = findNote(
    [
      product.shortDescription ?? "",
      product.description ?? "",
      product.benefits.join(" "),
      storeDescription,
    ],
    AUTHENTICITY_WORDS,
  );

  const chips = [
    cod ? (
      <Chip
        key="cod"
        icon={Banknote}
        label="COD available"
        detail={cod.label}
      />
    ) : null,
    deliveryNote ? (
      <Chip
        key="delivery"
        icon={Truck}
        label="Delivery"
        detail={timing ? `Estimated in ${timing}` : deliveryNote}
      />
    ) : null,
    authenticityNote ? (
      <Chip
        key="authenticity"
        icon={ShieldCheck}
        label="Authenticity"
        detail={authenticityNote}
      />
    ) : null,
  ].filter(Boolean);

  if (chips.length === 0) return null;

  return (
    <div className={cn("mt-5 flex flex-wrap gap-2")} aria-label="Purchase information">
      {chips}
    </div>
  );
}
