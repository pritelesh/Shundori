export interface PricedLine {
  /** Authoritative unit price in poisha, read from Supabase. */
  unitPrice: number;
  quantity: number;
}

export interface QuoteTotals {
  subtotal: number;
  total: number;
  totalQuantity: number;
}

/**
 * Integer-only poisha arithmetic. Browser-supplied prices are never passed
 * here: callers must provide prices read from the catalogue during this
 * request.
 */
export function calculateQuoteTotals(
  lines: readonly PricedLine[],
  deliveryCharge = 0,
  discount = 0,
): QuoteTotals {
  if (
    !Number.isInteger(deliveryCharge) ||
    deliveryCharge < 0 ||
    !Number.isInteger(discount) ||
    discount < 0
  ) {
    throw new RangeError("Delivery charge and discount must be non-negative integers.");
  }

  let subtotal = 0;
  let totalQuantity = 0;

  for (const line of lines) {
    if (
      !Number.isInteger(line.unitPrice) ||
      line.unitPrice < 0 ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 99
    ) {
      throw new RangeError("Invalid priced checkout line.");
    }

    subtotal += line.unitPrice * line.quantity;
    totalQuantity += line.quantity;
  }

  if (!Number.isSafeInteger(subtotal)) {
    throw new RangeError("The order subtotal is too large.");
  }

  return {
    subtotal,
    total: Math.max(0, subtotal + deliveryCharge - discount),
    totalQuantity,
  };
}
