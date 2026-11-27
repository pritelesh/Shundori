import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that will apply when you shop with Shundori.",
};

const sections = [
  {
    title: "Using the store",
    body: "By shopping with Shundori you agree to provide accurate account and delivery information and to use the store for lawful, personal purchases.",
  },
  {
    title: "Products and pricing",
    body: "Product descriptions, availability and prices will be kept as accurate as possible. Prices are shown in Bangladeshi Taka and include applicable taxes unless stated otherwise.",
  },
  {
    title: "Orders and payment",
    body: "An order is confirmed once payment is authorised and stock is verified. We will contact you if an item becomes unavailable after checkout.",
  },
  {
    title: "Delivery",
    body: "Delivery timelines and charges will be confirmed at checkout. Risk passes to you on delivery to the address provided.",
  },
  {
    title: "Returns and exchanges",
    body: "Unopened products in original condition may be eligible for return within the window published in our help centre. Hygiene-sealed items may be excluded once opened.",
  },
  {
    title: "Contact",
    body: "Questions about these terms will be welcomed once our customer care channels open at launch.",
  },
] as const;

export default function TermsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Legal"
        title="Terms & Conditions"
        description="The terms that will apply when you shop with Shundori."
      />

      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl">
          <div className="rounded-2xl border border-emerald/20 bg-emerald-soft p-5">
            <p className="text-sm font-medium text-charcoal">
              Placeholder terms
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              These terms are being prepared and will be published before the
              store opens. The sections below outline their final structure.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-xl text-charcoal">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <p className="mt-10 border-t border-line pt-6 text-xs text-muted">
            Last updated: November 2026 · Placeholder content pending legal
            review.
          </p>
        </div>
      </Container>
    </div>
  );
}
