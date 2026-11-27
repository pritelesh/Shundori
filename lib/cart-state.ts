import type { CartItem, CartProduct } from "@/types/cart";
import type { ProductTone, ProductVisualShape } from "@/types/product";

/**
 * Pure bag operations shared by the browser store and automated checks.
 *
 * These helpers never trust stored data: prices, quantities and stock values
 * are validated and clamped before they enter application state. Checkout also
 * re-reads every price and stock level from Supabase, so this module is only a
 * display cache, never an order-pricing source.
 */

const MAX_QUANTITY = 99;

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function recordOf(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

export function maxQuantity(product: Pick<CartProduct, "stockQuantity">): number {
  const stock = product.stockQuantity;
  if (typeof stock !== "number" || !Number.isFinite(stock)) return MAX_QUANTITY;
  return Math.min(MAX_QUANTITY, Math.max(0, Math.floor(stock)));
}

/** Parses localStorage JSON into a safe bag snapshot. */
export function parseCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];

  const items: CartItem[] = [];

  for (const entry of value) {
    const row = recordOf(entry);
    if (!row) continue;

    const id = optionalText(row.id);
    const name = optionalText(row.name);
    const price = row.price;
    const quantity = row.quantity;

    if (
      !id ||
      !name ||
      typeof price !== "number" ||
      !Number.isSafeInteger(price) ||
      price < 0 ||
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      continue;
    }

    const stock =
      typeof row.stockQuantity === "number" &&
      Number.isFinite(row.stockQuantity)
        ? Math.max(0, Math.floor(row.stockQuantity))
        : undefined;

    const visual =
      typeof row.visual === "string"
        ? (row.visual as ProductVisualShape)
        : undefined;
    const tone =
      typeof row.tone === "string" ? (row.tone as ProductTone) : undefined;

    const item: CartItem = {
      id,
      name,
      price,
      quantity: Math.min(quantity, MAX_QUANTITY, stock ?? MAX_QUANTITY),
      slug: optionalText(row.slug) ?? undefined,
      brandName: optionalText(row.brandName),
      imageUrl: optionalText(row.imageUrl),
      ...(visual === undefined ? {} : { visual }),
      ...(tone === undefined ? {} : { tone }),
      ...(stock === undefined ? {} : { stockQuantity: stock }),
    };

    if (item.quantity === 0) continue;

    // A hand-edited saved bag can contain the same product twice. Merge it so
    // checkout never receives duplicate lines, which the server rejects.
    const existingIndex = items.findIndex((entry) => entry.id === item.id);
    if (existingIndex === -1) {
      items.push(item);
      continue;
    }

    const existing = items[existingIndex]!;
    items[existingIndex] = {
      ...existing,
      quantity: Math.min(existing.quantity + item.quantity, maxQuantity(existing)),
    };
  }

  return items;
}

export function addCartItem(
  items: readonly CartItem[],
  product: CartProduct,
  quantity = 1,
): CartItem[] {
  const limit = maxQuantity(product);
  if (limit === 0) return [...items];

  const requested = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  const added = Math.min(Math.max(1, requested), limit);
  const existing = items.find((item) => item.id === product.id);

  if (!existing) return [...items, { ...product, quantity: added }];

  return items.map((item) =>
    item.id === product.id
      ? { ...item, quantity: Math.min(item.quantity + added, limit) }
      : item,
  );
}

export function setCartItemQuantity(
  items: readonly CartItem[],
  productId: string,
  quantity: number,
): CartItem[] {
  const nextQuantity = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
  if (nextQuantity <= 0) return items.filter((item) => item.id !== productId);

  return items
    .map((item) => {
      if (item.id !== productId) return item;
      const limit = maxQuantity(item);
      if (limit === 0) return null;
      return { ...item, quantity: Math.min(nextQuantity, limit) };
    })
    .filter((item): item is CartItem => item !== null);
}

export function removeCartItem(
  items: readonly CartItem[],
  productId: string,
): CartItem[] {
  return items.filter((item) => item.id !== productId);
}

export function cartCount(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function cartSubtotal(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + item.price * item.quantity, 0);
}

/** Stable identity used to avoid redundant React state updates. */
export function cartSignature(items: readonly CartItem[]): string {
  return JSON.stringify(
    items.map((item) => [
      item.id,
      item.price,
      item.quantity,
      item.stockQuantity ?? null,
      item.imageUrl ?? null,
    ]),
  );
}
