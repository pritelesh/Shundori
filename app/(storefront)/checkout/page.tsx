import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Shundori Cash on Delivery order.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <PageHeader
        eyebrow="Checkout"
        title="Almost yours."
        description="Confirm your delivery details. Your bag is rechecked against current prices and stock before the order is created."
      />
      <CheckoutForm />
    </>
  );
}
