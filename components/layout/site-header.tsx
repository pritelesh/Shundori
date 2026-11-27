import { Sparkles } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";

import { Logo } from "@/components/ui/logo";
import { getSearchIndexForHeader } from "@/services/catalog";
import {
  getPublicStoreSettings,
  getStoreAssetUrl,
} from "@/services/business-settings";

import { Container } from "./container";
import { HeaderActions } from "./header-actions";
import { NavigationMenu } from "./navigation-menu";

export async function SiteHeader() {
  // Search and store settings are request-time catalogue reads. The shell
  // renders a fallback until a real request arrives.
  await connection();
  const [searchIndex, settings] = await Promise.all([
    getSearchIndexForHeader(),
    getPublicStoreSettings(),
  ]);
  const logoUrl = getStoreAssetUrl(settings.storeLogoPath);

  return (
    <>
      <div className="bg-chocolate text-warm-white">
        <Container className="flex h-9 items-center justify-center gap-2 text-center">
          <Sparkles
            className="size-3 shrink-0 text-caramel"
            aria-hidden="true"
          />
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] sm:text-[10px]">
            Launching soon · Join the list for early access
          </p>
        </Container>
      </div>

      <header className="sticky top-0 z-40 border-b border-warm-line/80 bg-peach/95 backdrop-blur-sm">
        <Container className="flex h-16 items-center justify-between gap-4 lg:h-20">
          <Link href="/" className="shrink-0 rounded-sm">
            <Logo name={settings.storeName} imageUrl={logoUrl} />
            <span className="sr-only"> Home</span>
          </Link>

          <NavigationMenu className="hidden flex-1 justify-center lg:flex" />

          <HeaderActions searchIndex={searchIndex} />
        </Container>
      </header>
    </>
  );
}
