"use client";

import { ArrowRight, Box, Tag, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Modal } from "@/components/ui/modal";
import { SearchInput } from "@/components/ui/search-input";
import {
  getSearchSuggestions,
  type SearchSuggestion,
} from "@/lib/catalog-search";
import { cn } from "@/utils/cn";

const popularSearches = [
  "Serum",
  "Sunscreen",
  "Lipstick",
  "Face Wash",
  "Moisturizer",
] as const;

export interface SearchDialogProps {
  open: boolean;
  onClose: () => void;
  index: readonly SearchSuggestion[];
}

const suggestionIcons = {
  product: Box,
  brand: Tag,
  category: Tag,
} as const;

/** Client-side suggestions over the index supplied by the server. */
export function SearchDialog({ open, onClose, index }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const suggestions = useMemo(
    () => getSearchSuggestions(index, query),
    [index, query],
  );

  useEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const clear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Search Shundori"
      description="Search by product name, brand or category."
      className="max-w-xl"
    >
      <form onSubmit={submit} role="search">
        <div className="relative">
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search products, brands or categories"
            placeholder="What are you looking for?"
            className="pr-12"
          />
          {query ? (
            <button
              type="button"
              onClick={clear}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-taupe transition-colors hover:bg-warm-white hover:text-dark-text"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
        <button type="submit" className="sr-only">
          Search
        </button>
      </form>

      <div className="mt-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-taupe">
          {query ? "Suggestions" : "Popular searches"}
        </p>

        {query ? (
          <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {suggestions.length > 0 ? (
              suggestions.map((item) => {
                const Icon = suggestionIcons[item.type];
                return (
                  <li key={`${item.type}-${item.href}`}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-dark-text transition-colors hover:bg-warm-white"
                    >
                      <Icon className="size-4 shrink-0 text-olive-deep" aria-hidden="true" />
                      <span className="font-medium">{item.label}</span>
                      {item.detail ? (
                        <span className="ml-auto truncate text-xs text-taupe">
                          {item.detail}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })
            ) : (
              <li className="px-3 py-3 text-sm text-taupe">
                No instant matches. Press Enter to search the full catalogue.
              </li>
            )}
          </ul>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {popularSearches.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setQuery(term)}
                className="rounded-full border border-warm-line bg-warm-white px-3.5 py-1.5 text-xs text-dark-text transition-colors hover:border-olive-deep/40 hover:bg-olive-soft"
              >
                {term}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-warm-line/70 pt-4">
        <Link
          href="/shop"
          onClick={onClose}
          className={cn(
            "inline-flex items-center gap-1.5 text-sm font-medium text-olive-deep underline-offset-4 hover:underline",
          )}
        >
          Browse all products
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={() => {
            onClose();
            router.push("/search");
          }}
          className="text-sm text-taupe underline-offset-4 hover:text-dark-text hover:underline"
        >
          Advanced search
        </button>
      </div>
    </Modal>
  );
}
