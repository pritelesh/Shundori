import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { Logo } from "@/components/ui/logo";
import { safeSocialUrl } from "@/lib/whatsapp";
import {
  getPublicStoreSettings,
  getStoreAssetUrl,
} from "@/services/business-settings";

import { Container } from "./container";
import { NewsletterSection } from "./newsletter-section";

const shopLinks = [
  { label: "All products", href: "/shop" },
  { label: "Skincare", href: "/category/skincare" },
  { label: "Face Wash", href: "/category/face-wash" },
  { label: "Moisturizer", href: "/category/moisturizer" },
  { label: "Beauty Accessories", href: "/category/beauty-accessories" },
] as const;

const supportLinks = [
  { label: "Contact", href: "/contact" },
  { label: "Help centre", href: "/help" },
  { label: "Shipping & Delivery", href: "/help#shipping" },
  { label: "Returns & Exchanges", href: "/help#returns" },
  { label: "FAQs", href: "/help#faq" },
] as const;

const informationLinks = [
  { label: "How to order", href: "/help#ordering" },
  { label: "Payment methods", href: "/help#payment" },
  { label: "Track your order", href: "/track-order" },
  { label: "About Shundori", href: "/about" },
  { label: "Our brands", href: "/#brands" },
] as const;

const socialMonograms = {
  instagram: "IG",
  facebook: "FB",
  youtube: "YT",
  tiktok: "TT",
} as const;

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: ReadonlyArray<{ label: string; href: string }>;
}) {
  return (
    <div>
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-charcoal">
        {title}
      </h2>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm leading-6 text-muted underline-offset-4 transition-colors hover:text-charcoal hover:underline"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
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
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-full border border-line text-[10px] font-semibold uppercase tracking-[0.08em] text-muted transition-colors hover:border-emerald/30 hover:text-emerald"
    >
      <span aria-hidden="true">{monogram}</span>
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

  return (
    <footer id="contact" className="scroll-mt-24 bg-cream">
      <NewsletterSection />

      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-12 lg:py-16">
        <div>
          <Logo
            name={settings.storeName}
            imageUrl={logoUrl}
            tagline={settings.storeDescription.slice(0, 42) || undefined}
          />
          <p className="mt-5 max-w-xs text-sm leading-7 text-muted">
            {settings.storeDescription ||
              "Premium skincare, makeup and body care — a considered beauty edit for Bangladesh."}
          </p>

          {socialEntries.length > 0 ? (
            <div className="mt-6 flex items-center gap-2">
              {socialEntries.map(({ key, url, label, monogram }) => (
                <SocialLink
                  key={key}
                  href={url}
                  label={label}
                  monogram={monogram}
                />
              ))}
            </div>
          ) : null}

          <div className="mt-6 space-y-2 text-sm text-muted">
            <p className="flex items-start gap-2">
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-emerald"
                aria-hidden="true"
              />
              Dhaka, Bangladesh
            </p>
            {settings.contactNumber ? (
              <p className="flex items-start gap-2 break-words">
                <Phone
                  className="mt-0.5 size-4 shrink-0 text-emerald"
                  aria-hidden="true"
                />
                <a
                  href={contactHref("tel", settings.contactNumber)}
                  className="underline-offset-4 hover:text-charcoal hover:underline"
                >
                  {settings.contactNumber}
                </a>
              </p>
            ) : null}
            {settings.contactEmail ? (
              <p className="flex items-start gap-2 break-words">
                <Mail
                  className="mt-0.5 size-4 shrink-0 text-emerald"
                  aria-hidden="true"
                />
                <a
                  href={contactHref("mailto", settings.contactEmail)}
                  className="underline-offset-4 hover:text-charcoal hover:underline"
                >
                  {settings.contactEmail}
                </a>
              </p>
            ) : null}
          </div>
        </div>

        <FooterColumn title="Shop" links={shopLinks} />
        <FooterColumn title="Customer support" links={supportLinks} />
        <FooterColumn title="Shopping information" links={informationLinks} />
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col gap-4 py-6 text-xs text-muted lg:flex-row lg:items-center lg:justify-between">
          <p>© {settings.storeName}. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/privacy-policy"
              className="underline-offset-4 transition-colors hover:text-charcoal hover:underline"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="underline-offset-4 transition-colors hover:text-charcoal hover:underline"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/help"
              className="underline-offset-4 transition-colors hover:text-charcoal hover:underline"
            >
              Help
            </Link>
          </div>

          <p className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block size-1.5 rounded-full bg-emerald"
            />
            Made for Bangladesh
          </p>
        </Container>
      </div>
    </footer>
  );
}
