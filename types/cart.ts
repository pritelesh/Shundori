import type { ProductTone, ProductVisualShape } from "@/types/product";

/** Lightweight product data needed to render a bag line. */
export interface CartProduct {
  id: string;
  name: string;
  slug?: string;
  brandName?: string | null;
  /** Current selling price in poisha. */
  price: number;
  imageUrl?: string | null;
  visual?: ProductVisualShape;
  tone?: ProductTone;
  stockQuantity?: number;
}

export interface CartItem extends CartProduct {
  quantity: number;
}
