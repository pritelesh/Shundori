"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";

export type Locale = "en" | "bn";

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const STORAGE_KEY = "shundori-locale";
const listeners = new Set<() => void>();
let currentLocale: Locale = "en";
let initialized = false;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function readLocale(): Locale {
  if (typeof window === "undefined") return "en";
  if (!initialized) {
    initialized = true;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "bn" || saved === "en") currentLocale = saved;
  }
  return currentLocale;
}

function readServerLocale(): Locale {
  return "en";
}

function setLocale(next: Locale) {
  currentLocale = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, next);
  }
  for (const notify of listeners) notify();
}

/**
 * Presentation-only locale state for interface copy. It never changes data
 * access, routing or domain values; it only switches the rendered labels and
 * the document language so Bengali text uses the correct font stack.
 *
 * Each consumer reads the store directly through useSyncExternalStore so its
 * hydration render uses the server snapshot. Deferring the saved preference
 * here prevents Bengali copy from replacing English text before nested header
 * and footer boundaries have finished hydrating.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, readServerLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  return <>{children}</>;
}

export function useLocale(): LanguageContextValue {
  const locale = useSyncExternalStore(subscribe, readLocale, readServerLocale);
  return { locale, setLocale };
}
