import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { TrackOrderForm } from "@/components/orders/track-order-form";

export const metadata: Metadata = {
  title: "Track your order",
  description:
    "Check the latest status of your Shundori order using your order number and phone number.",
  robots: { index: false, follow: false },
};

export default function TrackOrderPage() {
  return (
    <>
      <PageHeader
        eyebrow="Customer care"
        title="Track your order"
        description="Enter the order number from your confirmation page and the phone number used at checkout. We only show the status of a matching order."
      />

      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <TrackOrderForm />

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-line bg-cream/50 p-5">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Your details stay private</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Both the order number and checkout phone number must match. The
                result never includes another customer&apos;s name, address, phone
                number or order total.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
