"use client";

import { ArrowRight, Heart, ShoppingBag, Search, User, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { Logo } from "@/components/ui/logo";

import { primaryNavigation } from "./navigation-menu";

export interface MobileMenuProps {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  onAccount: () => void;
  cartCount: number;
  wishlistCount: number;
}

export function MobileMenu({
  open,
  onClose,
  onSearch,
  onAccount,
  cartCount,
  wishlistCount,
}: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  return (
    <dialog
      id="mobile-menu"
      ref={dialogRef}
      aria-label="Site menu"
      data-panel="true"
      className="m-0 ml-auto h-dvh max-h-none w-[min(88vw,22rem)] max-w-none border-0 bg-peach p-0 text-dark-text"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-warm-line px-5 py-5">
          <Logo size="sm" withTagline={false} />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex size-9 items-center justify-center rounded-full text-taupe transition-colors hover:bg-warm-white hover:text-dark-text"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-5 py-6">
          <ul className="space-y-1">
            {primaryNavigation.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-xl px-3 py-3 font-display text-2xl text-dark-text transition-colors hover:bg-warm-white"
                >
                  {item.label}
                  <ArrowRight
                    className="size-4 text-taupe"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-1 border-t border-warm-line pt-6">
            <button
              type="button"
              onClick={() => {
                onClose();
                onSearch();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-dark-text transition-colors hover:bg-warm-white"
            >
              <Search className="size-4 text-taupe" aria-hidden="true" />
              Search
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAccount();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-dark-text transition-colors hover:bg-warm-white"
            >
              <User className="size-4 text-taupe" aria-hidden="true" />
              Account
            </button>
            <Link
              href="/wishlist"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-dark-text transition-colors hover:bg-warm-white"
            >
              <Heart className="size-4 text-taupe" aria-hidden="true" />
              Wishlist
              <span className="ml-auto rounded-full bg-soft-cream px-2 py-0.5 text-[10px] font-semibold text-dark-text">
                {wishlistCount}
              </span>
            </Link>
            <Link
              href="/cart"
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-dark-text transition-colors hover:bg-warm-white"
            >
              <ShoppingBag className="size-4 text-taupe" aria-hidden="true" />
              Bag
              <span className="ml-auto rounded-full bg-chocolate px-2 py-0.5 text-[10px] font-semibold text-warm-white">
                {cartCount}
              </span>
            </Link>
          </div>
        </nav>

        <div className="border-t border-warm-line px-5 py-5 text-xs leading-5 text-taupe">
          <p>Beauty · Dhaka, Bangladesh</p>
          <p className="mt-1">A considered edit of everyday beauty.</p>
        </div>
      </div>
    </dialog>
  );
}
