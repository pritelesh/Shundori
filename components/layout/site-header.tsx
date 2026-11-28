import Link from "next/link";
import { connection } from "next/server";

import { Logo } from "@/components/ui/logo";
import { siteConfig } from "@/lib/site";
import { whatsappUrl } from "@/lib/whatsapp";
import {
  getPublicStoreSettings,
  getStoreAssetUrl,
} from "@/services/business-settings";
import { getSearchIndexForHeader, listCategories } from "@/services/catalog";
import type { CatalogCategory } from "@/types/product";

import { AnnouncementBar } from "./announcement-bar";
import { Container } from "./container";
import { HeaderActions } from "./header-actions";

/** Auxiliary navigation should not break the shell when Supabase is down. */
async function loadNavigationCategories(): Promise<CatalogCategory[]> {
  try {
    return await listCategories();
  } catch (error) {
    console.warn("Navigation categories are temporarily unavailable.", error);
    return [];
  }
}

export async function SiteHeader() {
  // Search, store settings and categories are request-time catalogue reads.
  // The shell renders a fallback until a real request arrives.
  await connection();
  const [searchIndex, settings, categories] = await Promise.all([
    getSearchIndexForHeader(),
    getPublicStoreSettings(),
    loadNavigationCategories(),
  ]);
  const logoUrl = getStoreAssetUrl(settings.storeLogoPath);
  const announcement = (settings.storeDescription.trim() || siteConfig.tagline)
    .replace(/\s+/g, " ")
    .trim();

  const whatsappLink = settings.whatsappEnabled
    ? whatsappUrl(
        settings.whatsappNumber,
        `Hello ${settings.storeName}, I have a question.`,
      )
    : null;
  const helpIsWhatsapp = Boolean(whatsappLink);
  const helpUrl = whatsappLink ?? "/help";
  const helpLabel = helpIsWhatsapp
    ? { en: "WhatsApp", bn: "হোয়াটসঅ্যাপ" }
    : { en: "Help", bn: "সাহায্য" };
  const helpAriaLabel = helpIsWhatsapp
    ? `Chat with ${settings.storeName} on WhatsApp`
    : "Help centre";

  const logo = (
    <Link href="/" className="inline-flex min-h-11 shrink-0 items-center rounded-sm">
      <Logo name={settings.storeName} imageUrl={logoUrl} size="sm" />
      <span className="sr-only"> Home</span>
    </Link>
  );

  return (
    <>
      <AnnouncementBar message={announcement} />
      <header className="sticky top-0 z-40 border-b border-sage-light/80 bg-mist/90 backdrop-blur-[2px]">
        <Container>
          <HeaderActions
            logo={logo}
            searchIndex={searchIndex}
            categories={categories}
            helpUrl={helpUrl}
            helpLabel={helpLabel}
            helpAriaLabel={helpAriaLabel}
          />
        </Container>
      </header>
    </>
  );
}
