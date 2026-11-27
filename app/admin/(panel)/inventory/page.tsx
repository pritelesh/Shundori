import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { InventoryAlerts } from "@/components/admin/inventory-alerts";
import { InventoryManager } from "@/components/admin/inventory-manager";
import { guardAdminPage } from "@/services/admin-page-guard";
import { listOpenInventoryAlerts } from "@/services/inventory-alerts";
import {
  listAdminProducts,
  listInventoryChanges,
} from "@/services/admin-products";

// This page is request-authenticated and uses connection() in its guard.
export const instant = false;

export const metadata: Metadata = {
  title: "Inventory",
  robots: { index: false, follow: false },
};

export default async function AdminInventoryPage() {
  await guardAdminPage();
  const [products, changes, alerts] = await Promise.all([
    listAdminProducts(),
    listInventoryChanges(),
    listOpenInventoryAlerts(),
  ]);

  return (
    <>
      <AdminPageHeader
        eyebrow="Operations"
        title="Inventory"
        description="Adjust stock quantities, spot low inventory and review every change."
      />
      <section className="mt-8">
        <h2 className="font-display text-xl text-charcoal">Open stock alerts</h2>
        <p className="mt-1 text-sm text-muted">
          Alerts are created automatically when stock reaches a product&apos;s threshold.
        </p>
        <div className="mt-4">
          <InventoryAlerts alerts={alerts} />
        </div>
      </section>

      <div className="mt-8">
        <InventoryManager
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            stock: product.stockQuantity,
            threshold: product.lowStockThreshold,
            isActive: product.isActive,
          }))}
          changes={changes}
        />
      </div>
    </>
  );
}
