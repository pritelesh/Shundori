import { ArrowRight, HeartHandshake, Palette, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { PageHeader } from "@/components/layout/page-header";
import { buttonStyles } from "@/components/ui/button";
import { isDemoCatalogue } from "@/services/catalog";

export const metadata: Metadata = {
  title: "About Shundori",
  description: "Learn about the Shundori approach to a considered beauty edit.",
};

const values = [
  {
    icon: Palette,
    title: "An edited selection",
    description:
      "We would rather show a small, useful range than overwhelm you with choice.",
  },
  {
    icon: Sparkles,
    title: "Everyday beauty",
    description:
      "Products are presented around real routines, from cleansing to finishing touches.",
  },
  {
    icon: HeartHandshake,
    title: "Clear information",
    description:
      "The storefront is designed to make prices, availability and product details easy to find.",
  },
] as const;

export default async function AboutPage() {
  const demo = isDemoCatalogue();

  return (
    <>
      <PageHeader
        eyebrow="Our story"
        title="A calmer way to shop beauty."
        description="Shundori is a Bangladesh-focused beauty destination in progress. This phase presents the customer-facing experience; verified catalogue and ordering are planned for a later stage."
      />

      <Container className="py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="font-display text-3xl leading-tight text-charcoal sm:text-4xl">
              Considered, not complicated.
            </h2>
            <p className="mt-5 text-sm leading-7 text-muted">
              Beauty shopping should feel clear. Shundori brings skincare,
              makeup, haircare and accessories into one calm space with simple
              navigation, transparent prices and room to browse at your own
              pace.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted">
              {demo
                ? "The current catalogue is demonstration data. Brand names appear accurately as text, while product details and artwork are illustrative until verified supplier information is available."
                : "The catalogue is read from Supabase. Product details and photography are only as accurate as the records supplied by the Shundori team."}
            </p>
            <Link href="/shop" className={`${buttonStyles({ variant: "primary", size: "lg" })} mt-8`}>
              Explore the collection
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {values.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-2xl border border-line bg-white p-6 shadow-[0_18px_40px_-34px_rgba(31,31,31,0.5)]"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-emerald-soft text-emerald">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-xl text-charcoal">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 rounded-[2rem] bg-emerald px-6 py-12 text-white sm:px-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/80">
            Looking for help?
          </p>
          <h2 className="mt-3 font-display text-3xl">We are here to answer.</h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-white/85">
            Product questions, ordering guidance and support topics are collected
            in one place.
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
    </>
  );
}
