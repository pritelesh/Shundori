"use client";

import { ShoppingBag } from "lucide-react";

import { usePreviewStore } from "@/components/providers/preview-store";
import { Button, type ButtonSize } from "@/components/ui/button";
import type { CartProduct } from "@/types/cart";
import { cn } from "@/utils/cn";

export interface AddToCartButtonProps {
  product: CartProduct;
  quantity?: number;
  size?: ButtonSize;
  className?: string;
}

export function AddToCartButton({
  product,
  quantity = 1,
  size = "sm",
  className,
}: AddToCartButtonProps) {
  const { addToCart } = usePreviewStore();
  const inStock = product.stockQuantity !== 0;

  return (
    <Button
      size={size}
      variant={inStock ? "primary" : "outline"}
      disabled={!inStock}
      onClick={() => addToCart(product, quantity)}
      aria-label={
        inStock
          ? `Add to cart: ${product.name}`
          : `Sold out: ${product.name}`
      }
      className={cn("gap-2", className)}
    >
      <ShoppingBag className="size-4" aria-hidden="true" />
      {inStock ? "Add to cart" : "Sold out"}
    </Button>
  );
}
