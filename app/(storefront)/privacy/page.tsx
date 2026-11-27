import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Shundori will collect, use and protect your personal information.",
};

const sections = [
  {
    title: "Information we collect",
    body: "When the store opens, we will collect the details needed to process an order — such as your name, delivery address, phone number and email — together with basic information about how you use the site.",
  },
  {
    title: "How we use your information",
    body: "Your information will be used to fulfil orders, provide customer support, improve the shopping experience and, only with your consent, send occasional updates about new arrivals and launch news.",
  },
  {
    title: "Sharing and storage",
    body: "We will share only what is necessary with delivery and payment partners. Account and order data will be stored securely with our infrastructure providers and retained only as long as needed.",
  },
  {
    title: "Your choices",
    body: "You will be able to request access to, correction of, or deletion of your personal information, and to unsubscribe from marketing messages at any time.",
  },
  {
    title: "Contact",
    body: "Questions about privacy will be welcomed once our customer care channels open at launch.",
  },
] as const;

export default function PrivacyPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="How Shundori will collect, use and protect your information."
      />

      <Container className="py-14 sm:py-20">
        <div className="max-w-3xl">
          <div className="rounded-2xl border border-chocolate/30 bg-soft-cream p-5">
            <p className="text-sm font-medium text-dark-text">
              Placeholder policy
            </p>
            <p className="mt-1 text-sm leading-6 text-taupe">
              This policy is being prepared and will be published before the
              store opens. The sections below outline its final structure.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-xl text-dark-text">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm leading-7 text-taupe">
                  {section.body}
                </p>
              </section>
            ))}
          </div>

          <p className="mt-10 border-t border-warm-line pt-6 text-xs text-taupe">
            Last updated: November 2026 · Placeholder content pending legal
            review.
          </p>
        </div>
      </Container>
    </div>
  );
}
