import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Help Centre",
  description:
    "Shopping, delivery, returns and payment guidance for Shundori customers.",
};

const sections = [
  {
    id: "ordering",
    title: "How to order",
    body: "Browse the edit, add your favourites to the bag and follow checkout. Ordering opens with the store; this page will be replaced with a step-by-step guide at launch.",
  },
  {
    id: "payment",
    title: "Payment methods",
    body: "We are confirming local payment partners, including mobile financial services and cards. The final list will be shown at checkout and published here before launch.",
  },
  {
    id: "shipping",
    title: "Shipping & delivery",
    body: "Delivery will cover Dhaka and nationwide addresses. Charges, timelines and any launch offers will be confirmed before the store opens.",
  },
  {
    id: "returns",
    title: "Returns & exchanges",
    body: "Our returns window and hygiene rules for opened products are being finalised. The complete policy will be published here before launch.",
  },
  {
    id: "tracking",
    title: "Track your order",
    body: "Use the Track your order page with your order number and checkout phone number. Courier tracking and delivery estimates appear only when a delivery partner is connected.",
  },
  {
    id: "faq",
    title: "Frequently asked questions",
    body: "Questions about product details, delivery and suitability will be answered here. For now, Shundori offers clear product information, islandwide delivery and cash on delivery.",
  },
  {
    id: "contact",
    title: "Contact us",
    body: "Email and phone details will be published at launch. Our customer care team will be available to help with product advice, orders and after-sales support.",
  },
] as const;

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Customer care"
        title="How can we help?"
        description="Everything you need to shop with confidence — from placing an order to delivery, returns and payment. Some details are still being confirmed."
      />

      <Container className="py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          <nav aria-label="Help topics" className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-soft">
              On this page
            </p>
            <ul className="mt-4 space-y-2.5">
              {sections.map((section) => (
                <li key={section.id}>
                  <Link
                    href={`#${section.id}`}
                    className="inline-flex min-h-11 items-center text-sm text-leaf underline-offset-4 transition-colors hover:text-forest hover:underline"
                  >
                    {section.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="max-w-3xl space-y-10">
            {sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-28 border-b border-sage-light pb-10 last:border-b-0 last:pb-0"
              >
                <h2 className="font-display text-2xl text-forest">
                  {section.title}
                </h2>
                <p className="mt-3 text-sm leading-7 text-ink-soft">
                  {section.body}
                </p>
              </section>
            ))}

            <div className="rounded-2xl border border-leaf/20 bg-sage-light p-6">
              <p className="font-display text-lg text-forest">
                Still have a question?
              </p>
              <p className="mt-2 text-sm leading-6 text-ink-soft">
                Contact details will be published at launch. Until then, this
                page is a design preview of the customer care experience.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
