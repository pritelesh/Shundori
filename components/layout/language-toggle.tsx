"use client";

import { Languages } from "lucide-react";

import { useLocale } from "@/components/providers/language-provider";
import { cn } from "@/utils/cn";

export interface LanguageToggleProps {
  className?: string;
  /** Dark surface variant for the forest footer. */
  tone?: "light" | "dark";
}

/** Compact EN/BN segmented pill used in the header, mobile menu and footer. */
export function LanguageToggle({
  className,
  tone = "light",
}: LanguageToggleProps) {
  const { locale, setLocale } = useLocale();
  const dark = tone === "dark";

  const buttonClass = cn(
    "relative inline-flex min-h-9 min-w-9 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40",
    dark
      ? "text-cream/80 hover:bg-cream/15 hover:text-cream"
      : "text-ink-soft hover:bg-sage-light/70 hover:text-forest",
  );

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full border p-0.5",
        dark
          ? "border-cream/25 bg-transparent"
          : "border-sage-light/70 bg-cream/80",
        className,
      )}
    >
      <Languages
        className={cn(
          "mx-1 size-3.5 shrink-0",
          dark ? "text-mist" : "text-leaf",
        )}
        aria-hidden="true"
      />
      <button
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
        className={cn(
          buttonClass,
          locale === "en" &&
            (dark ? "bg-cream text-forest" : "bg-forest text-cream"),
        )}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={locale === "bn"}
        onClick={() => setLocale("bn")}
        className={cn(
          buttonClass,
          locale === "bn" &&
            (dark ? "bg-cream text-forest" : "bg-forest text-cream"),
        )}
      >
        BN
      </button>
    </div>
  );
}
