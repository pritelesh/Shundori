import { Settings2 } from "lucide-react";
import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  DeliveryChargeForm,
} from "@/components/admin/settings-form";
import { StoreSettingsForm } from "@/components/admin/store-settings-form";
import { guardAdminPage } from "@/services/admin-page-guard";
import { getAdminDeliveryCharge } from "@/services/admin-settings";
import {
  getAdminStoreSettings,
  getStoreAssetUrl,
} from "@/services/business-settings";
import { formatPrice } from "@/utils/format";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  await guardAdminPage();
  const [deliveryCharge, storeSettings] = await Promise.all([
    getAdminDeliveryCharge(),
    getAdminStoreSettings(),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Store settings"
        description="Manage the storefront identity, contact channels and the delivery charge used at checkout."
      />

      <section className="surface-card rounded-2xl p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-xl text-forest">
          <Settings2 className="size-5 text-leaf" aria-hidden="true" />
          Store details
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          These values flow into the public header, footer, SEO metadata and
          WhatsApp enquiry links.
        </p>
        <div className="mt-6">
          <StoreSettingsForm
            settings={storeSettings}
            logoUrl={getStoreAssetUrl(storeSettings.storeLogoPath)}
          />
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_20rem]">
        <section className="surface-card rounded-2xl p-6 sm:p-8">
          <h2 className="flex items-center gap-2 font-display text-xl text-forest">
            <Settings2 className="size-5 text-leaf" aria-hidden="true" />
            Delivery charge
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">
            This amount is read from Supabase at checkout. Browser-supplied
            totals can never change it.
          </p>
          <div className="mt-6">
            <DeliveryChargeForm poisha={deliveryCharge} />
          </div>
        </section>

        <aside className="surface-card rounded-2xl p-6">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
            Current delivery charge
          </p>
          <p className="mt-2 font-display text-3xl text-forest">
            {formatPrice(deliveryCharge)}
          </p>
          <p className="mt-4 text-xs leading-5 text-ink-soft">
            Existing orders keep the delivery charge that was calculated when
            they were placed.
          </p>
        </aside>
      </div>
    </>
  );
}
