import { ChevronDown, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import type { ReactNode } from "react";

import { Logo } from "@/components/ui/logo";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/payment-methods";
import { contactPlaceholders, siteConfig } from "@/lib/site";
import { safeSocialUrl, whatsappUrl } from "@/lib/whatsapp";
import {
  getPublicStoreSettings,
  getStoreAssetUrl,
} from "@/services/business-settings";
import { listCategories } from "@/services/catalog";

import { Container } from "./container";
import { LanguageToggle } from "./language-toggle";
import { Localized } from "./localized";
import { NewsletterSection } from "./newsletter-section";

interface FooterLink {
  label: string;
  bn?: string;
  href: string;
}

const helpLinks: readonly FooterLink[] = [
  { label: "Contact", bn: "যোগাযোগ", href: "/contact" },
  { label: "Help & FAQ", bn: "সহায়তা ও প্রশ্নোত্তর", href: "/help#faq" },
  {
    label: "Shipping & delivery",
    bn: "শিপিং ও ডেলিভারি",
    href: "/help#shipping",
  },
  { label: "Terms", bn: "শর্তাবলী", href: "/terms" },
  { label: "Privacy", bn: "গোপনীয়তা", href: "/privacy-policy" },
];

const companyLinks: readonly FooterLink[] = [
  { label: "About", bn: "সম্পর্কে", href: "/about" },
  { label: "Contact", bn: "যোগাযোগ", href: "/contact" },
];

const footerTitles: Record<string, string> = {
  Shop: "শপ",
  Help: "সহায়তা",
  Company: "কোম্পানি",
  Connect: "যোগাযোগ",
};

const socialMonograms = {
  instagram: "IG",
  facebook: "FB",
  youtube: "YT",
  tiktok: "TT",
} as const;

/**
 * Desktop heading and list; the same content becomes a native accordion on
 * mobile, so no client javascript is needed for the disclosure.
 */
function FooterGroup({ title, children }: { title: string; children: ReactNode }) {
  const heading = <Localized en={title} bn={footerTitles[title] ?? title} />;

  return (
    <>
      <div className="hidden md:block">
        <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-cream">
          {heading}
        </h2>
        <div className="mt-4 space-y-2.5">{children}</div>
      </div>
      <details className="group border-b border-cream/15 py-1 md:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.1em] text-cream marker:hidden">
          {heading}
          <ChevronDown
            className="size-4 shrink-0 text-cream/70 transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-2.5 pb-4">{children}</div>
      </details>
    </>
  );
}

function FooterLinkList({ links }: { links: readonly FooterLink[] }) {
  return (
    <>
      {links.map((link) => (
        <Link
          key={`${link.href}-${link.label}`}
          href={link.href}
          className="inline-flex min-h-11 min-w-11 items-center text-sm leading-6 text-cream/75 underline-offset-4 transition-colors hover:text-cream hover:underline"
        >
          <Localized en={link.label} bn={link.bn ?? link.label} />
        </Link>
      ))}
    </>
  );
}

function SocialLink({
  href,
  label,
  monogram,
}: {
  href: string;
  label: string;
  monogram: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (${monogram})`}
      className="inline-flex min-h-11 items-center gap-2 text-sm leading-6 text-cream/75 underline-offset-4 transition-colors hover:text-cream hover:underline"
    >
      <span
        aria-hidden="true"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-cream/25 text-[0.65rem] font-semibold uppercase tracking-[0.08em]"
      >
        {monogram}
      </span>
      {label}
    </a>
  );
}

function contactHref(prefix: "tel" | "mailto", value: string): string {
  const safe =
    prefix === "tel"
      ? value.replace(/[^\d+]/g, "")
      : value.replace(/[^\w@.+-]/g, "");
  return `${prefix}:${safe}`;
}

export async function SiteFooter() {
  await connection();
  const settings = await getPublicStoreSettings();
  const logoUrl = getStoreAssetUrl(settings.storeLogoPath);

  // Categories come from the catalogue service. A transient read failure must
  // not take down the footer on every page.
  let categories: Awaited<ReturnType<typeof listCategories>> = [];
  try {
    categories = await listCategories();
  } catch {
    categories = [];
  }
  const shopLinks: FooterLink[] = [
    { label: "All products", bn: "সব পণ্য", href: "/shop" },
    ...categories.slice(0, 8).map((category) => ({
      label: category.name,
      href: `/category/${category.slug}`,
    })),
  ];

  const whatsappHref = settings.whatsappEnabled
    ? whatsappUrl(
        settings.whatsappNumber,
        `Hello ${settings.storeName}, I have a question.`,
      )
    : null;

  const socialEntries = Object.entries(settings.socialLinks).flatMap(
    ([key, value]) => {
      const url = safeSocialUrl(value);
      const monogram = socialMonograms[key as keyof typeof socialMonograms];
      return url && monogram
        ? [
            {
              key,
              url,
              label: key.charAt(0).toUpperCase() + key.slice(1),
              monogram,
            },
          ]
        : [];
    },
  );

  const connectEntries = [
    whatsappHref
      ? {
          key: "whatsapp",
          url: whatsappHref,
          label: "WhatsApp",
          monogram: "WA",
        }
      : null,
    ...socialEntries,
  ].filter((entry): entry is (typeof socialEntries)[number] => entry !== null);

  // Only methods explicitly enabled in the central payment registry are shown.
  const enabledPayments = PAYMENT_METHOD_OPTIONS.filter((method) => method.enabled);

  return (
    <footer className="bg-forest-soft text-cream">
      <NewsletterSection />

      <Container className="py-10 sm:py-12">
        <div className="flex flex-col gap-5 border-b border-cream/15 pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo
              name={settings.storeName || siteConfig.name}
              imageUrl={logoUrl}
              tagline={settings.storeDescription.slice(0, 42) || undefined}
              className="[&>span]:text-cream [&>span+span]:text-mist"
            />
            <p className="mt-3 max-w-sm text-sm leading-6 text-cream/70">
              {settings.storeDescription || siteConfig.tagline}
            </p>
          </div>
          <div className="space-y-1.5 text-sm text-cream/70">
            {settings.contactNumber ? (
              <p className="flex items-center gap-2 break-words">
                <Phone className="size-4 shrink-0 text-mist" aria-hidden="true" />
                <a
                  href={contactHref("tel", settings.contactNumber)}
                  className="underline-offset-4 hover:text-cream hover:underline"
                >
                  {settings.contactNumber}
                </a>
              </p>
            ) : null}
            {settings.contactEmail ? (
              <p className="flex items-center gap-2 break-words">
                <Mail className="size-4 shrink-0 text-mist" aria-hidden="true" />
                <a
                  href={contactHref("mailto", settings.contactEmail)}
                  className="underline-offset-4 hover:text-cream hover:underline"
                >
                  {settings.contactEmail}
                </a>
              </p>
            ) : null}
            <p className="text-xs text-cream/75">
              {contactPlaceholders.city}, {siteConfig.country}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-4 md:gap-8">
          <FooterGroup title="Shop">
            <FooterLinkList links={shopLinks} />
          </FooterGroup>
          <FooterGroup title="Help">
            <FooterLinkList links={helpLinks} />
          </FooterGroup>
          <FooterGroup title="Company">
            <FooterLinkList links={companyLinks} />
          </FooterGroup>
          <FooterGroup title="Connect">
            {connectEntries.length > 0 ? (
              connectEntries.map((entry) => (
                <SocialLink
                  key={entry.key}
                  href={entry.url}
                  label={entry.label}
                  monogram={entry.monogram}
                />
              ))
            ) : (
              <Link
                href="/contact"
                className="inline-flex min-h-11 min-w-11 items-center text-sm leading-6 text-cream/75 underline-offset-4 transition-colors hover:text-cream hover:underline"
              >
                <Localized en="Contact us" bn="যোগাযোগ করুন" />
              </Link>
            )}
          </FooterGroup>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-cream/15 pt-6 sm:flex-row sm:items-center sm:gap-5">
          <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.1em] text-cream/70">
            <Localized en="Payments accepted" bn="গ্রহণযোগ্য পেমেন্ট" />
          </p>
          <ul className="flex flex-wrap gap-2" aria-label="Payments accepted">
            {enabledPayments.map((method) => (
              <li
                key={method.id}
                className="inline-flex items-center gap-2 rounded-full border border-cream/25 px-3 py-1.5 text-xs text-cream/85"
              >
                <span
                  aria-hidden="true"
                  className="inline-block size-1.5 rounded-full bg-lime"
                />
                {method.label}
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <div className="border-t border-cream/15">
        <Container className="flex flex-col gap-4 py-5 text-xs text-cream/70 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.storeName || siteConfig.name}.{" "}
            <Localized en="All rights reserved." bn="সম্পত্তি সংরক্ষিত।" />
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/privacy-policy"
              className="inline-flex min-h-11 min-w-11 items-center underline-offset-4 transition-colors hover:text-cream hover:underline"
            >
              <Localized en="Privacy" bn="গোপনীয়তা" />
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-11 min-w-11 items-center underline-offset-4 transition-colors hover:text-cream hover:underline"
            >
              <Localized en="Terms" bn="শর্তাবলী" />
            </Link>
            <Link
              href="/help"
              className="inline-flex min-h-11 min-w-11 items-center underline-offset-4 transition-colors hover:text-cream hover:underline"
            >
              <Localized en="Help" bn="সহায়তা" />
            </Link>
            <LanguageToggle tone="dark" />
          </div>
        </Container>
      </div>
    </footer>
  );
}
