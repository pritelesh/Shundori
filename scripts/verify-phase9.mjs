import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), "utf8");

test("confirmation links cannot leak as referrers or through shared caches", () => {
  const config = read("next.config.ts");
  assert.match(config, /source:\s*"\/order-success\/:path\*"/);
  assert.match(config, /Referrer-Policy"\s*,\s*value:\s*"no-referrer"/);
  assert.match(config, /Cache-Control"\s*,\s*value:\s*"private, no-store"/);
  const proxy = read("proxy.ts");
  assert.match(proxy, /applyConfirmationHeaders/);
  assert.match(proxy, /response\.headers\.set\("Referrer-Policy", "no-referrer"\)/);
  assert.match(proxy, /response\.headers\.set\("Cache-Control", "private, no-store"\)/);
});

test("local Supabase image optimization covers every public asset bucket", () => {
  const config = read("next.config.ts");
  assert.match(
    config,
    /hostname: "127\.0\.0\.1"[\s\S]{0,160}pathname: "\/storage\/v1\/object\/public\/\*\*"/,
  );
  assert.match(
    config,
    /hostname: "localhost"[\s\S]{0,160}pathname: "\/storage\/v1\/object\/public\/\*\*"/,
  );
});

test("product gallery uses optimized responsive images and cannot overflow", () => {
  const gallery = read("components/products/product-gallery.tsx");
  assert.match(gallery, /import Image from "next\/image"/);
  assert.match(gallery, /<Image[\s\S]*?fill[\s\S]*?sizes=/);
  assert.match(gallery, /flex-wrap/);
  assert.match(gallery, /shrink-0/);
  assert.doesNotMatch(gallery, /no-img-element/);
});

test("visible badges and social monograms have matching accessible names", () => {
  const badge = read("components/products/discount-badge.tsx");
  const footer = read("components/layout/site-footer.tsx");
  assert.match(badge, /aria-label=\{`-\$\{percent\}% off`\}/);
  assert.match(footer, /aria-label=\{`\$\{label\} \(\$\{monogram\}\)`\}/);
});

test("admin eyebrow text has sufficient contrast on the cream header", () => {
  const header = read("components/admin/admin-page-header.tsx");
  assert.match(header, /tracking-\[0\.22em\] text-charcoal/);
  assert.doesNotMatch(header, /tracking-\[0\.22em\] text-pink/);
});

test("below-the-fold grids do not preload images by default", () => {
  const grid = read("components/catalog/product-grid.tsx");
  assert.match(grid, /priority = false/);
  assert.match(grid, /priority=\{priority\}/);
  assert.doesNotMatch(grid, /index < 2/);
});

test("public store settings are deduplicated per request", () => {
  const settings = read("services/business-settings.ts");
  assert.match(settings, /import \{ cache \} from "react"/);
  assert.match(settings, /getPublicStoreSettings = cache\(async function/);
});

test("toast consumers do not re-render for unrelated toast state", () => {
  const toast = read("components/ui/toast.tsx");
  assert.match(toast, /useMemo\(\(\) => \(\{ toast \}\), \[toast\]\)/);
  assert.match(toast, /<ToastContext.Provider value=\{value\}>/);
});

test("admin stock writes are conditional and history uses the same observed value", () => {
  const service = read("services/admin-products.ts");
  assert.match(service, /\.eq\("stock_quantity", product\.stock_quantity\)/);
  assert.match(service, /previous_quantity: product\.stock_quantity/);
  assert.match(service, /if \(!updated\?\.length\) continue;/);
});

test("service role key remains server-only", () => {
  const env = read("lib/env/server.ts");
  const admin = read("lib/supabase/admin.ts");
  assert.match(env, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(env, /process\.env\.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY\s*\|\|/);
  assert.match(admin, /server-only/);
});

test("customer tracking and confirmation responses stay privacy-safe", () => {
  const tracking = read("supabase/migrations/0008_phase7_orders.sql");
  const confirmation = read("app/(storefront)/order-success/[orderNumber]/page.tsx");
  assert.match(tracking, /payload never contains customer identity, address or order totals/i);
  assert.doesNotMatch(confirmation, /customer_address/);
  assert.match(confirmation, /getOrderConfirmation/);
});

test("admin login session check is excluded from prerendering", () => {
  const login = read("app/admin/(auth)/login/page.tsx");
  const panel = read("app/admin/(panel)/layout.tsx");
  assert.match(login, /import \{ connection \} from "next\/server"/);
  assert.match(login, /await connection\(\);[\s\S]{0,200}getAdminAccess\(\)/);
  assert.match(panel, /await connection\(\);[\s\S]{0,200}getAdminAccess\(\)/);
});

test("Phase 9 QA added no product feature migration or admin navigation entry", () => {
  const migrations = readdirSync(path.join(root, "supabase", "migrations"));
  assert.equal(migrations.some((file) => /^0011_/.test(file)), false);
  assert.doesNotMatch(read("components/admin/admin-nav.tsx"), /Phase 9/i);
});
