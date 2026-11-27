import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

import ts from "typescript";

/**
 * Static Phase 8 verification. These checks need no database: they cover the
 * pure helpers, the additive migration's security boundaries and the UI wiring.
 */
function loadTs(relativePath) {
  const filename = resolve(process.cwd(), relativePath);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });

  const moduleRecord = { exports: {} };
  const blockedRequire = () => {
    throw new Error(`Unexpected runtime import in ${relativePath}`);
  };

  new Function(
    "exports",
    "require",
    "module",
    "__filename",
    "__dirname",
    outputText,
  )(moduleRecord.exports, blockedRequire, moduleRecord, filename, dirname(filename));

  return moduleRecord.exports;
}

function read(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function functionBody(source, signature) {
  const start = source.indexOf(`create or replace function ${signature}`);
  assert.ok(start >= 0, `${signature} is missing`);
  const end = source.indexOf("$$;", start);
  assert.ok(end > start, `${signature} has an unterminated body`);
  return source.slice(start, end);
}

const offers = loadTs("lib/offer-pricing.ts");
const whatsapp = loadTs("lib/whatsapp.ts");
const { whatsappUrl } = whatsapp;
const migration = read("supabase/migrations/0010_phase8.sql");
const packageJson = JSON.parse(read("package.json"));

test("offer prices honour starts, ends and the shared database rule", () => {
  const now = new Date("2026-11-27T12:00:00Z");
  const product = {
    regularPrice: 200000,
    salePrice: 150000,
    saleStartsAt: "2026-11-27T11:00:00Z",
    saleEndsAt: "2026-11-27T13:00:00Z",
  };

  assert.equal(offers.isOfferActive(product, now), true);
  assert.equal(offers.effectivePrice(product, now), 150000);
  assert.equal(offers.effectiveCompareAtPrice(product, now), 200000);
  assert.equal(offers.offerDiscountPercentage(product, now), 25);

  assert.equal(
    offers.effectivePrice(product, new Date("2026-11-27T10:59:59Z")),
    200000,
    "a sale must not be shown before its start date",
  );
  assert.equal(
    offers.effectivePrice(product, new Date("2026-11-27T13:00:00Z")),
    200000,
    "a sale must expire exactly at its end date",
  );
  assert.equal(
    offers.effectiveCompareAtPrice(
      { regularPrice: 100000, salePrice: null },
      now,
    ),
    null,
  );

  // Checkout supplies raw database rows, so the helper accepts both shapes.
  assert.equal(
    offers.effectivePrice(
      {
        regular_price: 90000,
        sale_price: 50000,
        sale_starts_at: null,
        sale_ends_at: "2026-01-01T00:00:00Z",
      },
      now,
    ),
    90000,
  );
});

test("WhatsApp and social links are normalized and safely encoded", () => {
  assert.equal(whatsapp.normalizeWhatsappNumber("+88 01712-345678"), "8801712345678");
  assert.equal(whatsapp.normalizeWhatsappNumber("01712345678"), "8801712345678");
  assert.equal(whatsapp.normalizeWhatsappNumber("javascript:alert(1)"), "");

  const url = whatsappUrl("01712345678", "Question about Shundori & more?");
  assert.match(url, /^https:\/\/wa\.me\/8801712345678\?text=/);
  assert.match(url, /Shundori%20%26%20more%3F/);
  assert.equal(whatsappUrl("", "Hello"), null);

  assert.equal(
    whatsapp.safeSocialUrl("javascript:alert(1)"),
    null,
    "script URLs must never become links",
  );
  assert.equal(
    whatsapp.safeSocialUrl("https://example.com/page?q=1"),
    "https://example.com/page?q=1",
  );
  assert.equal(whatsapp.safeSocialUrl("//example.com"), null);
});

test("applied migrations 0008 and 0009 remain immutable Phase 7 fixes", () => {
  const seven = read("supabase/migrations/0008_phase7_orders.sql");
  const fixes = read("supabase/migrations/0009_order_audit_fixes.sql");

  assert.match(seven, /create table if not exists public\.order_status_changes/);
  assert.match(seven, /cancellation_stock_restored boolean not null default false/);
  assert.match(seven, /orders_enforce_status_transition/);
  assert.match(fixes, /Shundori Phase 7 audit fixes/);
  assert.match(fixes, /A missing product aborts stock restoration/);
  assert.match(fixes, /if v_item\.product_id is null then/);
  assert.match(fixes, /A product for this order is no longer available/);
});

test("Phase 8 migration is additive and revokes anonymous write access", () => {
  assert.doesNotMatch(migration, /drop table/i);
  assert.doesNotMatch(migration, /drop column/i);
  assert.match(migration, /alter table public\.products\s+add column if not exists sale_starts_at/);
  assert.match(migration, /add column if not exists coupon_code text/);

  for (const table of [
    "coupons",
    "coupon_redemptions",
    "wishlists",
    "product_reviews",
    "enquiries",
    "inventory_alerts",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(
      migration,
      new RegExp(`revoke all on public\\.${table} from anon, authenticated`),
    );
  }
});

test("coupon validation is public-safe; redemption stays atomic and privileged", () => {
  assert.match(migration, /code = upper\(btrim\(code\)\)/);
  assert.match(migration, /discount_value <= 10000/);
  assert.match(migration, /p_subtotal < p_coupon\.minimum_subtotal_poisha/);
  assert.match(migration, /p_coupon\.redemptions_count >= p_coupon\.usage_limit/);

  const evaluateGrants = migration.match(
    /grant execute on function public\.evaluate_coupon[\s\S]*?;/,
  );
  assert.ok(evaluateGrants);
  assert.match(evaluateGrants[0], /to service_role/);
  assert.doesNotMatch(evaluateGrants[0], /to anon|to authenticated/);

  const validateGrants = migration.match(
    /grant execute on function public\.validate_coupon[\s\S]*?;/,
  );
  assert.ok(validateGrants);
  assert.match(validateGrants[0], /to anon, authenticated, service_role/);

  const place = functionBody(migration, "public.place_cod_order(");
  assert.match(place, /pg_advisory_xact_lock/);
  assert.match(place, /where code = v_coupon_code\s+for update/);
  assert.match(place, /insert into public\.coupon_redemptions/);
  assert.match(place, /redemptions_count = redemptions_count \+ 1/);
  assert.match(place, /public\.effective_product_price\(v_product\)/);

  const placeGrants = migration.match(
    /grant execute on function public\.place_cod_order[\s\S]*?;/,
  );
  assert.ok(placeGrants);
  assert.match(placeGrants[0], /to service_role/);
  assert.doesNotMatch(placeGrants[0], /to anon|to authenticated/);
});

test("reviews require delivered purchases and begin unapproved", () => {
  const eligibility = functionBody(migration, "public.can_review_product(");
  assert.match(eligibility, /o\.order_status = 'delivered'/);
  assert.match(eligibility, /coalesce\(o\.cancellation_status, 'none'\) not in/);
  assert.match(eligibility, /o\.customer_id = auth\.uid\(\)/);

  assert.match(migration, /is_approved boolean not null default false/);
  assert.match(migration, /create policy "Approved reviews are public"/);
  assert.match(migration, /using \(is_approved\)/);
  assert.match(migration, /create policy "Admins moderate reviews"/);
  assert.match(migration, /and is_approved = false/);
  assert.match(migration, /and public\.can_review_product\(product_id\)/);
});

test("wishlists are owner-only and guests stay on the client", () => {
  assert.match(migration, /constraint wishlists_user_product_key unique/);
  assert.match(migration, /using \(auth\.uid\(\) = user_id\)/);
  assert.match(migration, /with check \(auth\.uid\(\) = user_id\)/);
  assert.match(migration, /grant select, insert, delete on public\.wishlists to authenticated/);

  const store = read("components/providers/preview-store.tsx");
  assert.match(store, /localStorage/);
  assert.match(store, /setAuthenticated/);

  const sync = read("components/wishlist/wishlist-sync-client.tsx");
  assert.match(sync, /syncWishlistAction/);

  const service = read("services/wishlist.ts");
  assert.match(service, /Returns null for guests/);
  assert.match(service, /onConflict: "user_id,product_id"/);
});

test("enquiries verify orders privately and expose only admin reads", () => {
  const orderEnquiry = functionBody(migration, "public.create_order_enquiry(");
  assert.match(orderEnquiry, /and regexp_replace\(o\.customer_phone/);
  assert.match(orderEnquiry, /The same generic error avoids confirming whether an order exists/);
  assert.doesNotMatch(orderEnquiry, /return jsonb_build_object\([^)]*customer/);

  assert.match(migration, /create policy "Admins read enquiries"/);
  assert.match(migration, /grant select, update on public\.enquiries to authenticated/);
  assert.match(migration, /grant execute on function public\.create_order_enquiry/);

  const actions = read("app/(storefront)/enquiries/actions.ts");
  assert.match(actions, /revalidatePath\("\/admin\/enquiries"\)/);
  assert.doesNotMatch(actions, /revalidatePath\("\/admin\/orders"/);
});

test("store settings are public through one narrow function and sanitized before render", () => {
  const settings = functionBody(migration, "public.get_store_settings(");
  assert.match(settings, /storeName/);
  assert.match(settings, /storeLogoPath/);
  assert.match(settings, /whatsappEnabled/);
  assert.match(settings, /socialLinks/);
  assert.doesNotMatch(settings, /delivery_charge|confirmation_token|customer_/);

  assert.match(migration, /'store-assets', 'store-assets', true, 5242880/);
  assert.match(migration, /bucket_id = 'store-assets'/);
  assert.match(migration, /grant execute on function public\.get_store_settings/);

  const service = read("services/business-settings.ts");
  assert.match(service, /safeSocialUrl/);
  assert.match(service, /allowed\.includes\(file\.type\)/);
  assert.match(service, /5 \* 1024 \* 1024/);

  const nextConfig = read("next.config.ts");
  assert.match(nextConfig, /store-assets/);
});

test("inventory alerts are trigger-driven and have exactly one open row per condition", () => {
  assert.match(migration, /create unique index if not exists inventory_alerts_open_unique/);
  assert.match(migration, /where resolved_at is null/);
  assert.match(migration, /products_refresh_inventory_alerts/);
  assert.match(migration, /after insert or update of stock_quantity, low_stock_threshold/);
  assert.match(migration, /alert_type = 'out_of_stock'/);
  assert.match(migration, /alert_type = 'low_stock'/);
  assert.match(migration, /create policy "Admins read inventory alerts"/);
});

test("analytics returns aggregates only and is service-role only", () => {
  const analytics = functionBody(migration, "public.phase8_analytics_report(");
  assert.match(analytics, /totalSales/);
  assert.match(analytics, /bestSellingProducts/);
  assert.match(analytics, /topBrands/);
  assert.match(analytics, /monthlySales/);
  assert.match(analytics, /inventory/);
  assert.match(analytics, /o\.order_status not in \('cancelled', 'returned'\)/);
  assert.match(analytics, /o\.payment_status <> 'refunded'/);
  assert.doesNotMatch(analytics, /customer_name|customer_phone|customer_email|delivery_address/);

  const grants = migration.match(
    /grant execute on function public\.phase8_analytics_report[\s\S]*?;/,
  );
  assert.ok(grants);
  assert.match(grants[0], /to service_role/);
  assert.doesNotMatch(grants[0], /to anon|to authenticated/);
});

test("SEO routes are wired without indexing private or demo pages", () => {
  const sitemap = read("app/sitemap.ts");
  const robots = read("app/robots.ts");
  const seo = read("lib/seo.ts");
  const productPage = read("app/(storefront)/product/[slug]/page.tsx");

  assert.match(sitemap, /getSitemapUrls/);
  assert.match(robots, /\/admin\//);
  assert.match(robots, /\/checkout/);
  assert.match(robots, /sitemap: absoluteUrl\("\/sitemap\.xml"\)/);
  assert.match(seo, /alternates: \{ canonical: url \}/);
  assert.match(seo, /openGraph/);
  assert.match(seo, /application\/ld\+json|jsonLdScript/);
  assert.match(productPage, /productJsonLd\(product\)/);
  assert.match(productPage, /productMetadata\(product\)/);
  assert.match(productPage, /noIndex: demo|robots: \{ index: false/);
  assert.ok(read("app/opengraph-image.tsx"));
  assert.ok(read("app/(storefront)/product/[slug]/opengraph-image.tsx"));
});

test("all Phase 8 customer and admin workflows are present", () => {
  const productPage = read("app/(storefront)/product/[slug]/page.tsx");
  const trackForm = read("components/orders/track-order-form.tsx");
  const nav = read("components/admin/admin-nav.tsx");
  const inventoryPage = read("app/admin/(panel)/inventory/page.tsx");
  const reportsPage = read("app/admin/(panel)/reports/page.tsx");
  const shell = read("components/layout/storefront-shell.tsx");

  assert.match(productPage, /<ProductEnquiry/);
  assert.match(productPage, /<ProductWhatsappButton/);
  assert.match(trackForm, /<OrderEnquiryForm/);
  assert.match(nav, /\/admin\/enquiries/);
  assert.match(inventoryPage, /<InventoryAlerts/);
  assert.match(inventoryPage, /threshold: product\.lowStockThreshold/);
  assert.match(reportsPage, /getAnalyticsReport/);
  assert.match(shell, /WhatsappButton|WhatsAppButton|whatsapp/i);

  assert.ok(read("app/admin/(panel)/enquiries/page.tsx"));
  assert.ok(read("app/admin/(panel)/coupons/page.tsx"));
  assert.ok(read("app/admin/(panel)/reviews/page.tsx"));
  assert.ok(read("app/admin/(panel)/settings/page.tsx"));
});

test("Phase 8 scripts are available and Phase 9 has not been started", () => {
  assert.equal(packageJson.scripts["verify:phase8"], "node --test scripts/verify-phase8.mjs");
  assert.equal(packageJson.scripts["audit:phase8"], "node scripts/audit-phase8.mjs");
  assert.equal(packageJson.scripts["cleanup:phase8"], "node scripts/cleanup-phase8.mjs");

  const migrations = readdirSync(resolve(process.cwd(), "supabase/migrations"));
  assert.equal(migrations.some((file) => /^0011_/.test(file)), false);
  assert.doesNotMatch(read("components/admin/admin-nav.tsx"), /Phase 9/i);
});
