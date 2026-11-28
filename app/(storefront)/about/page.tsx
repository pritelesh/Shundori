import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { TrustSignals } from "@/components/layout/trust-signals";
import { buttonStyles } from "@/components/ui/button";
import { isDemoCatalogue } from "@/services/catalog";

export const metadata: Metadata = {
  title: "About Shundori",
  description:
    "Learn about authentic beauty products, delivery across Bangladesh and cash on delivery at Shundori.",
};

export default async function AboutPage() {
  const demo = isDemoCatalogue();

  return (
    <div className="pt-14 sm:pt-16">
      <PageHeader
        eyebrow="About Shundori"
        title="Beauty you can order with confidence."
        description="Shundori is a Bangladesh-focused beauty storefront. This phase presents the customer experience; verified catalogue and ordering are planned for a later stage."
      />

      <Container className="py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-3xl leading-tight text-forest sm:text-4xl">
              Clear prices, delivered.
            </h2>
            <p className="mt-5 text-sm leading-7 text-ink-soft">
              Shundori brings skincare, makeup, haircare and accessories into
              one place with visible prices, stock information and delivery
              across Bangladesh. Pay cash when your order arrives.
            </p>
            <p className="mt-4 text-sm leading-7 text-ink-soft">
              {demo
                ? "The current catalogue is demonstration data. Brand names appear accurately as text, while product details and artwork are illustrative until verified supplier information is available."
                : "The catalogue is read from Supabase. Product details and photography are only as accurate as the records supplied by the Shundori team."}
            </p>
            <Link href="/shop" className={`${buttonStyles({ variant: "primary", size: "lg" })} mt-8`}>
              Shop products
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <TrustSignals variant="cards" />
        </div>

        <div className="mt-16 rounded-[2rem] bg-forest px-6 py-12 text-cream sm:px-12">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-cream/80">
            Looking for help?
          </p>
          <h2 className="mt-3 font-display text-3xl text-cream">
            Questions? Ask us.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-cream/85">
            Get help with products, orders and delivery in one place.
          </p>
          <Link
            href="/contact"
            className={buttonStyles({ variant: "primary", size: "lg", className: "mt-6" })}
          >
            Contact Shundori
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </div>
  );
}
