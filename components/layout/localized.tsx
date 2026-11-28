"use client";

import { useLocale } from "@/components/providers/language-provider";

export interface LocalizedProps {
  en: string;
  bn: string;
  className?: string;
}

/** Renders a single interface label in the active presentation locale. */
export function Localized({ en, bn, className }: LocalizedProps) {
  const { locale } = useLocale();
  return <span className={className}>{locale === "bn" ? bn : en}</span>;
}
