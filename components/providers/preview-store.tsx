"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { useToast } from "@/components/ui/toast";
import {
  addCartItem,
  cartCount,
  cartSignature,
  cartSubtotal,
  parseCart,
  removeCartItem,
  setCartItemQuantity,
} from "@/lib/cart-state";
import type { CartItem, CartProduct } from "@/types/cart";

interface PreviewStoreValue {
  cart: readonly CartItem[];
  cartCount: number;
  subtotal: number;
  wishlist: ReadonlySet<string>;
  /** Null until the account state has been checked; false means guest mode. */
  authenticated: boolean | null;
  /** False during SSR/hydration, true once localStorage has been read. */
  ready: boolean;
  addToCart: (product: CartProduct, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  /** Replaces cart snapshots with server-refreshed catalogue data. */
  replaceCart: (items: readonly CartItem[]) => void;
  toggleWishlist: (product: Pick<CartProduct, "id" | "name">) => void;
  /** Replaces the local wishlist with an authoritative account snapshot. */
  replaceWishlist: (ids: readonly string[]) => void;
  setAuthenticated: (value: boolean) => void;
  isWishlisted: (id: string) => boolean;
}

const CART_STORAGE_KEY = "shundori.cart.v1";
const WISHLIST_STORAGE_KEY = "shundori.wishlist.v1";

interface StoreSnapshot {
  cart: CartItem[];
  wishlist: ReadonlySet<string>;
  hydrated: boolean;
}

const EMPTY_SNAPSHOT: StoreSnapshot = {
  cart: [],
  wishlist: new Set(),
  hydrated: false,
};

const PreviewStoreContext = createContext<PreviewStoreValue | null>(null);

let snapshot: StoreSnapshot = EMPTY_SNAPSHOT;
let cachedRawCart: string | null | undefined;
let cachedRawWishlist: string | null | undefined;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function parseWishlist(value: unknown): Set<string> {
  if (!Array.isArray(value)) return new Set();
  return new Set(
    value.filter((entry): entry is string => typeof entry === "string"),
  );
}

/**
 * Reads localStorage as an external store. useSyncExternalStore handles the
 * server/client hydration difference without a setState-in-effect pass, and
 * the cache keeps repeated snapshot reads referentially stable.
 */
function getClientSnapshot(): StoreSnapshot {
  if (typeof window === "undefined") return EMPTY_SNAPSHOT;

  try {
    const rawCart = window.localStorage.getItem(CART_STORAGE_KEY);
    const rawWishlist = window.localStorage.getItem(WISHLIST_STORAGE_KEY);

    if (
      cachedRawCart !== undefined &&
      cachedRawCart === rawCart &&
      cachedRawWishlist !== undefined &&
      cachedRawWishlist === rawWishlist
    ) {
      return snapshot;
    }

    cachedRawCart = rawCart;
    cachedRawWishlist = rawWishlist;

    let cart: CartItem[] = [];
    if (rawCart) {
      try {
        cart = parseCart(JSON.parse(rawCart) as unknown);
      } catch {
        cart = [];
      }
    }

    let wishlist = new Set<string>();
    if (rawWishlist) {
      try {
        wishlist = parseWishlist(JSON.parse(rawWishlist) as unknown);
      } catch {
        wishlist = new Set();
      }
    }

    snapshot = { cart, wishlist, hydrated: true };
    return snapshot;
  } catch {
    cachedRawCart = null;
    cachedRawWishlist = null;
    if (snapshot.hydrated) return snapshot;
    snapshot = { cart: [], wishlist: new Set(), hydrated: true };
    return snapshot;
  }
}

function getServerSnapshot(): StoreSnapshot {
  return EMPTY_SNAPSHOT;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  const onStorage = (event: StorageEvent) => {
    if (
      event.key === CART_STORAGE_KEY ||
      event.key === WISHLIST_STORAGE_KEY ||
      event.key === null
    ) {
      cachedRawCart = undefined;
      cachedRawWishlist = undefined;
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

function persistCart(next: readonly CartItem[]): void {
  const current = getClientSnapshot();
  if (cartSignature(current.cart) === cartSignature(next)) return;

  const items = [...next];
  const raw = JSON.stringify(items);
  snapshot = { ...current, cart: items };
  cachedRawCart = raw;

  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_STORAGE_KEY, raw);
    }
  } catch {
    // Private-mode storage failures must not break the in-memory bag.
  }

  emit();
}

function persistWishlist(next: ReadonlySet<string>): void {
  const current = getClientSnapshot();
  if (
    current.wishlist.size === next.size &&
    [...current.wishlist].every((id) => next.has(id))
  ) {
    return;
  }

  const ids = [...next];
  const raw = JSON.stringify(ids);
  snapshot = { ...current, wishlist: new Set(ids) };
  cachedRawWishlist = raw;

  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(WISHLIST_STORAGE_KEY, raw);
    }
  } catch {
    // Ignore blocked storage; the wishlist still works for this page view.
  }

  emit();
}

/**
 * Browser bag and wishlist state.
 *
 * The bag persists in localStorage so it survives navigation and refreshes.
 * It is a display cache only: checkout always re-reads product prices and
 * stock on the server and never trusts quantities or totals from this store.
 */
export function PreviewStoreProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );
  const [authenticated, setAuthenticatedState] = useState<boolean | null>(null);
  const { toast } = useToast();

  const addToCart = useCallback(
    (product: CartProduct, quantity = 1) => {
      const limit =
        typeof product.stockQuantity === "number"
          ? Math.max(0, Math.floor(product.stockQuantity))
          : 99;

      if (limit === 0) {
        toast({
          title: "This product is sold out",
          description: `${product.name} cannot be added to your bag.`,
          variant: "info",
        });
        return;
      }

      persistCart(addCartItem(getClientSnapshot().cart, product, quantity));

      toast({
        title: "Added to bag",
        description: `${product.name} · saved on this device.`,
        variant: "success",
      });
    },
    [toast],
  );

  const setQuantity = useCallback((productId: string, quantity: number) => {
    persistCart(
      setCartItemQuantity(getClientSnapshot().cart, productId, quantity),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    persistCart(removeCartItem(getClientSnapshot().cart, productId));
  }, []);

  const clearCart = useCallback(() => persistCart([]), []);

  const replaceCart = useCallback((items: readonly CartItem[]) => {
    const next = items
      .map((item) => ({
        ...item,
        quantity: Math.max(1, Math.floor(item.quantity)),
      }))
      .filter((item) => item.quantity > 0);

    persistCart(next);
  }, []);

  const toggleWishlist = useCallback(
    (product: Pick<CartProduct, "id" | "name">) => {
      const saved = getClientSnapshot().wishlist;
      const next = new Set(saved);

      if (next.has(product.id)) {
        next.delete(product.id);
      } else {
        next.add(product.id);
      }

      persistWishlist(next);
      toast({
        title: saved.has(product.id) ? "Removed from wishlist" : "Saved to wishlist",
        description: product.name,
        variant: saved.has(product.id) ? "info" : "promo",
      });
    },
    [toast],
  );

  const replaceWishlist = useCallback((ids: readonly string[]) => {
    persistWishlist(new Set(ids));
  }, []);

  const setAuthenticated = useCallback((value: boolean) => {
    setAuthenticatedState(value);
  }, []);

  const isWishlisted = useCallback(
    (id: string) => current.wishlist.has(id),
    [current.wishlist],
  );

  const count = useMemo(() => cartCount(current.cart), [current.cart]);
  const subtotal = useMemo(() => cartSubtotal(current.cart), [current.cart]);

  const value = useMemo(
    () => ({
      cart: current.cart,
      cartCount: count,
      subtotal,
      wishlist: current.wishlist,
      authenticated,
      ready: current.hydrated,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      replaceCart,
      toggleWishlist,
      replaceWishlist,
      setAuthenticated,
      isWishlisted,
    }),
    [
      current.cart,
      current.wishlist,
      current.hydrated,
      authenticated,
      count,
      subtotal,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      replaceCart,
      toggleWishlist,
      replaceWishlist,
      setAuthenticated,
      isWishlisted,
    ],
  );

  return (
    <PreviewStoreContext.Provider value={value}>
      {children}
    </PreviewStoreContext.Provider>
  );
}

export function usePreviewStore(): PreviewStoreValue {
  const context = useContext(PreviewStoreContext);
  if (!context) {
    throw new Error("usePreviewStore must be used inside a PreviewStoreProvider.");
  }
  return context;
}
