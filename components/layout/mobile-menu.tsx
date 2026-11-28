"use client";

import { ArrowRight, Heart, ShoppingBag, Search, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Logo } from "@/components/ui/logo";
import type { CatalogCategory } from "@/types/product";

import { LanguageToggle } from "./language-toggle";
import { Localized } from "./localized";
import { categoriesHref, primaryNavigation } from "./navigation-menu";

export interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  onAccount: () => void;
  cartCount: number;
  wishlistCount: number;
  categories: readonly CatalogCategory[];
  categoriesOpen: boolean;
  onCategoriesOpen: () => void;
  onCategoriesClose: () => void;
}

export function MobileMenu({
  open,
  onClose,
  onSearch,
  onAccount,
  cartCount,
  wishlistCount,
  categories,
  categoriesOpen,
  onCategoriesOpen,
  onCategoriesClose,
}: MobileMenuProps) {
  const menuDialogRef = useRef<HTMLDialogElement>(null);
  const categoriesDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = menuDialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = categoriesDialogRef.current;
    if (!dialog) return;

    if (categoriesOpen && !dialog.open) {
      dialog.showModal();
    } else if (!categoriesOpen && dialog.open) {
      dialog.close();
    }
  }, [categoriesOpen]);

  useEffect(() => {
    const dialog = menuDialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  useEffect(() => {
    const dialog = categoriesDialogRef.current;
    if (!dialog) return;

    const handleClose = () => onCategoriesClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onCategoriesClose]);

  return (
    <>
      <dialog
        id="mobile-menu"
        ref={menuDialogRef}
        aria-label="Site menu"
        data-panel="true"
        className="fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-none w-[min(88vw,22rem)] max-w-none border-0 bg-mist p-0 text-ink-soft"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sage-light px-5 py-5">
            <Logo size="sm" withTagline={false} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-ink-soft"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-6">
            <ul className="space-y-1">
              {primaryNavigation.map((item) => {
                const content = (
                  <>
                    <Localized en={item.label} bn={item.bn} />
                    <ArrowRight
                      className="size-4 text-ink-soft"
                      aria-hidden="true"
                    />
                  </>
                );
                const itemClass =
                  "flex w-full min-h-12 items-center justify-between rounded-xl px-3 py-3 font-display text-2xl text-leaf transition-colors hover:bg-cream hover:text-forest";

                return (
                  <li key={item.label}>
                    {item.href === categoriesHref ? (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onCategoriesOpen();
                        }}
                        className={itemClass}
                      >
                        {content}
                      </button>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={itemClass}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 space-y-1 border-t border-sage-light pt-6">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSearch();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-ink-soft transition-colors hover:bg-cream"
              >
                <Search className="size-4 text-ink-soft" aria-hidden="true" />
                <Localized en="Search" bn="খুঁজুন" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onAccount();
                }}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-ink-soft transition-colors hover:bg-cream"
              >
                <User className="size-4 text-ink-soft" aria-hidden="true" />
                <Localized en="Account" bn="অ্যাকাউন্ট" />
              </button>
              <Link
                href="/wishlist"
                onClick={onClose}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm text-ink-soft transition-colors hover:bg-cream"
              >
                <Heart className="size-4 text-ink-soft" aria-hidden="true" />
                <Localized en="Wishlist" bn="পছন্দের তালিকা" />
                <span className="ml-auto rounded-full bg-sage-light px-2 py-0.5 text-xs font-semibold text-ink-soft">
                  {wishlistCount}
                </span>
              </Link>
              <Link
                href="/cart"
                onClick={onClose}
                className="flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm text-ink-soft transition-colors hover:bg-cream"
              >
                <ShoppingBag className="size-4 text-ink-soft" aria-hidden="true" />
                <Localized en="Bag" bn="ব্যাগ" />
                <span className="ml-auto rounded-full bg-lime px-2 py-0.5 text-xs font-semibold text-forest">
                  {cartCount}
                </span>
              </Link>
            </div>
          </nav>

          <div className="border-t border-sage-light px-5 py-5 text-xs leading-5 text-ink-soft">
            <LanguageToggle />
            <p className="mt-4">
              <Localized
                en="Beauty · Dhaka, Bangladesh"
                bn="সৌন্দর্য · ঢাকা, বাংলাদেশ"
              />
            </p>
            <p className="mt-1">
              <Localized
                en="Skincare, makeup and essentials with delivery across Bangladesh."
                bn="বাংলাদেশজুড়ে ডেলিভারিসহ স্কিনকেয়ার, মেকআপ ও দৈনন্দিন পণ্য।"
              />
            </p>
          </div>
        </div>
      </dialog>

      <dialog
        id="mobile-categories"
        ref={categoriesDialogRef}
        aria-labelledby="mobile-categories-title"
        data-panel="true"
        className="fixed inset-0 m-0 h-dvh w-full max-w-none border-0 bg-mist p-0 text-ink-soft"
        onClick={(event) => {
          if (event.target === event.currentTarget) onCategoriesClose();
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sage-light px-5 py-5">
            <h2
              id="mobile-categories-title"
              className="font-display text-2xl text-forest"
            >
              <Localized en="Categories" bn="বিভাগ" />
            </h2>
            <button
              type="button"
              onClick={onCategoriesClose}
              aria-label="Close categories"
              className="inline-flex size-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-cream hover:text-ink-soft"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="All categories" className="flex-1 overflow-y-auto px-5 py-6">
            {categories.length > 0 ? (
              <ul className="space-y-2">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/category/${category.slug}`}
                      onClick={onCategoriesClose}
                      className="flex min-h-14 items-center justify-between surface-card rounded-xl px-4 transition-colors hover:border-sage hover:bg-cream"
                    >
                      <span className="font-display text-xl text-forest">
                        {category.name}
                      </span>
                      <ArrowRight
                        className="size-4 text-leaf"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="surface-card rounded-xl px-4 py-5 text-sm text-ink-soft">
                <Localized
                  en="Categories are being prepared. Browse the full collection in the meantime."
                  bn="বিভাগগুলো প্রস্তুত করা হচ্ছে। এর মধ্যে সম্পূর্ণ সংগ্রহ দেখুন।"
                />
              </p>
            )}

            <Link
              href="/shop"
              onClick={onCategoriesClose}
              className="mt-6 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-leaf underline-offset-4 hover:underline"
            >
              <Localized en="View all products" bn="সব পণ্য দেখুন" />
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </dialog>
    </>
  );
}
