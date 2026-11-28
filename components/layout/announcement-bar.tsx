"use client";

import { Sparkles, X } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Container } from "./container";

const STORAGE_PREFIX = "shundori.announcement.v1:";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(STORAGE_PREFIX)) {
      listener();
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function readDismissed(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function readServerSnapshot(): boolean {
  return false;
}

function dismiss(key: string): void {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // The in-memory snapshot below still hides the bar for this visit.
  }
  for (const listener of listeners) listener();
}

export interface AnnouncementBarProps {
  message: string;
}

/**
 * Single-line store announcement. The copy is supplied by the server from
 * site metadata or public business settings; only dismissal is client state.
 */
export function AnnouncementBar({ message }: AnnouncementBarProps) {
  const storageKey = `${STORAGE_PREFIX}${message}`;
  const dismissed = useSyncExternalStore(
    subscribe,
    () => readDismissed(storageKey),
    readServerSnapshot,
  );

  if (dismissed) return null;

  return (
    <div className="bg-forest-soft text-cream">
      <Container className="relative flex items-center justify-center gap-2 px-10 py-1.5 text-center sm:px-12">
        <Sparkles
          className="size-3.5 shrink-0 text-lime"
          aria-hidden="true"
        />
        <p className="line-clamp-1 text-xs font-medium leading-4">
          {message}
        </p>
        <button
          type="button"
          onClick={() => dismiss(storageKey)}
          aria-label="Dismiss announcement"
          className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-cream/80 transition-colors hover:bg-cream/10 hover:text-cream"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      </Container>
    </div>
  );
}
