import type { Metadata } from "next";

import { CartView } from "@/components/cart/cart-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Your Bag",
  description: "Review quantities and totals in your Shundori shopping bag.",
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your bag"
        title="A little beauty, set aside."
        description="Adjust quantities or remove items. Your bag is saved on this device and rechecked at checkout."
      />
      <CartView />
    </>
  );
}
