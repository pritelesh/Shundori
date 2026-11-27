import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { createClient } from "@supabase/supabase-js";

/**
 * Loads `.env.local` without requiring a Node flag that newer runtimes only
 * support. Real environment variables always win, so CI can inject values.
 */
function loadLocalEnv() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(
      line,
    );
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;

    let value = rawValue.trim();
    const quote = value.charAt(0);
    if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
      value = value.slice(1, -1);
    } else {
      value = value.split(/\s+#/)[0].trim();
    }

    process.env[key] = value;
  }
}

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error(
    "Supabase verification needs NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "Add the values to .env.local, then run: npm run verify:supabase",
  );
  process.exit(1);
}

const BUCKET_ID = "product-images";
const TABLES = [
  "profiles",
  "brands",
  "categories",
  "products",
  "orders",
  "order_items",
  "store_settings",
  "order_status_changes",
  "courier_shipments",
];

const PHASE7_TABLES = ["order_status_changes", "courier_shipments"];

const TABLE_PRIMARY_KEYS = {
  store_settings: "key",
};

// 0005_verification.sql predates store_settings and the Phase 7 tables, so its
// report functions only cover the original six tables.
const PHASE4_REPORT_TABLES = TABLES.filter(
  (table) => table !== "store_settings" && !PHASE7_TABLES.includes(table),
);

const EXPECTED_POLICIES = {
  profiles: [
    "Profiles are visible to their owner",
    "Profiles are visible to admins",
    "Owners may update contact details",
    "Admins may manage profiles",
  ],
  brands: ["Active brands are public", "Admins manage brands"],
  categories: ["Active categories are public", "Admins manage categories"],
  products: ["Active products are public", "Admins manage products"],
  orders: ["Customers can view their own orders", "Admins manage orders"],
  order_items: [
    "Customers can view their own order items",
    "Admins manage order items",
  ],
  store_settings: [],
  order_status_changes: ["Admins read order status changes"],
  courier_shipments: ["Admins read courier shipments"],
};

const EXPECTED_FK_FRAGMENTS = {
  profiles: [/users\(/i],
  brands: [],
  categories: [/categories\(id\)/i],
  products: [/brands\(/i, /categories\(/i],
  orders: [/users\(/i],
  order_items: [/orders\(/i, /products\(/i],
  store_settings: [],
  order_status_changes: [/orders\(/i, /users\(/i],
  courier_shipments: [/orders\(/i],
};

const results = [];

function messageOf(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return String(error);
}

function errorCode(error) {
  if (!error || typeof error !== "object") return "";
  return "code" in error && typeof error.code === "string" ? error.code : "";
}

function isNetworkError(error) {
  return /fetch failed|ENOTFOUND|network error|failed to fetch/i.test(
    messageOf(error),
  );
}

function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

function skip(name, reason) {
  console.log(`SKIP  ${name} — ${reason}`);
}

function info(name, detail) {
  console.log(`INFO  ${name} — ${detail}`);
}

function supabaseClient() {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const supabase = supabaseClient();

function missingTable(error) {
  const message = messageOf(error);
  return /does not exist/i.test(message) || message.includes("PGRST205");
}

function storagePathFromValue(value) {
  if (typeof value !== "string" || value.length === 0) return null;

  if (!/^https?:\/\//i.test(value)) {
    return /^products\/[0-9a-f-]+\/[^/]+$/i.test(value) ? value : null;
  }

  try {
    const parsed = new URL(value);
    if (!/(^|\.)supabase\.co$/i.test(parsed.hostname)) return null;

    const marker = "/storage/v1/object/public/product-images/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const path = decodeURIComponent(
      parsed.pathname.slice(markerIndex + marker.length),
    );

    return /^products\/[0-9a-f-]+\/[^/]+$/i.test(path) ? path : null;
  } catch {
    return null;
  }
}

function tinyPng() {
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  return Uint8Array.from(Buffer.from(base64, "base64"));
}

async function checkAnonymousStorageWrite() {
  const path = `products/00000000-0000-4000-8000-000000000000/anon-verify-${Date.now()}.png`;
  const { error } = await supabase.storage
    .from(BUCKET_ID)
    .upload(path, tinyPng(), { contentType: "image/png", upsert: false });

  if (error) {
    check(
      "Anonymous Storage upload is denied",
      !isNetworkError(error),
      messageOf(error),
    );
    return;
  }

  await supabase.storage.from(BUCKET_ID).remove([path]);
  check("Anonymous Storage upload is denied", false, "upload unexpectedly succeeded");
}

async function checkSchemaReports() {
  const { data: rlsRows, error: rlsError } = await supabase.rpc(
    "phase4_rls_report",
  );

  if (rlsError) {
    check(
      "Verification helpers are available",
      false,
      `${messageOf(rlsError)} — apply 0005_verification.sql`,
    );
    return false;
  }

  check("Verification helpers are available", true);

  for (const table of PHASE4_REPORT_TABLES) {
    const row = (rlsRows ?? []).find((entry) => entry.table_name === table);
    check(`${table} RLS is enabled`, Boolean(row?.row_security));

    const policies = new Set(row?.policies ?? []);
    const missing = EXPECTED_POLICIES[table].filter(
      (policy) => !policies.has(policy),
    );
    check(
      `${table} policies are present`,
      missing.length === 0,
      missing.length ? `missing: ${missing.join(", ")}` : "",
    );
  }

  const { data: fkRows, error: fkError } = await supabase.rpc(
    "phase4_fk_report",
  );
  check("Foreign-key report is available", !fkError, messageOf(fkError));

  for (const table of PHASE4_REPORT_TABLES) {
    const row = (fkRows ?? []).find((entry) => entry.table_name === table);
    const definitions = (row?.foreign_keys ?? []).join(" | ");
    const missing = EXPECTED_FK_FRAGMENTS[table].filter(
      (fragment) => !fragment.test(definitions),
    );
    check(
      `${table} foreign keys exist`,
      missing.length === 0,
      missing.length ? `missing: ${missing.map(String).join(", ")}` : "",
    );
  }

  const { data: buckets, error: bucketError } = await supabase.rpc(
    "phase4_storage_report",
  );
  check("Storage report is available", !bucketError, messageOf(bucketError));

  const bucket = (buckets ?? []).find(
    (entry) => entry.bucket_id === BUCKET_ID,
  );
  check("product-images bucket exists", Boolean(bucket));

  if (bucket) {
    check("product-images bucket is public", bucket.is_public === true);
    check(
      "product-images size limit is 5 MB",
      Number(bucket.file_size_limit) === 5242880,
      `${bucket.file_size_limit}`,
    );

    const allowed = new Set(bucket.allowed_mime_types ?? []);
    const missingMime = ["image/jpeg", "image/png", "image/webp"].filter(
      (type) => !allowed.has(type),
    );
    check(
      "product-images MIME allowlist is correct",
      missingMime.length === 0,
      missingMime.length ? `missing: ${missingMime.join(", ")}` : "",
    );
  }

  return true;
}

async function checkTableExistence() {
  for (const table of TABLES) {
    const primaryKey = TABLE_PRIMARY_KEYS[table] ?? "id";
    const { error } = await supabase.from(table).select(primaryKey).limit(1);
    const missing = missingTable(error) || isNetworkError(error);
    check(`${table} table exists`, !missing, missing ? messageOf(error) : "");
  }
}

async function checkPublicCatalogue() {
  const { data: brands, error: brandError } = await supabase
    .from("brands")
    .select("id, name, slug")
    .eq("is_active", true)
    .limit(5);
  check("Active brand fetch", !brandError, messageOf(brandError));
  info("Active brand rows", `${brands?.length ?? 0} (seeding is optional)`);

  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .limit(5);
  check("Active category fetch", !categoryError, messageOf(categoryError));
  info("Active category rows", `${categories?.length ?? 0} (seeding is optional)`);

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, slug, images, brands(name), categories(name)")
    .eq("is_active", true)
    .limit(5);
  check("Public product fetch", !productError, messageOf(productError));
  info("Active product rows", `${products?.length ?? 0} (seeding is optional)`);

  if (products && products.length > 0) {
    check(
      "Product brand/category relationships resolve",
      products.every(
        (product) =>
          Object.prototype.hasOwnProperty.call(product, "brands") &&
          Object.prototype.hasOwnProperty.call(product, "categories"),
      ),
    );
  } else {
    skip("Product relationship row check", "no active products are seeded");
  }

  return products ?? [];
}

async function checkAnonymousRls() {
  const { data: inactiveProducts, error: inactiveError } = await supabase
    .from("products")
    .select("id")
    .eq("is_active", false)
    .limit(5);
  check(
    "Anonymous cannot read inactive products",
    !inactiveError && (inactiveProducts?.length ?? 0) === 0,
    messageOf(inactiveError),
  );

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .limit(5);
  check(
    "Anonymous cannot read profiles",
    !isNetworkError(profileError) &&
      (Boolean(profileError) || (profiles?.length ?? 0) === 0),
    messageOf(profileError),
  );

  const { data: orders, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .limit(5);
  check(
    "Anonymous cannot read orders",
    !isNetworkError(orderError) &&
      (Boolean(orderError) || (orders?.length ?? 0) === 0),
    messageOf(orderError),
  );

  const { error: priceUpdateError } = await supabase
    .from("products")
    .update({ regular_price: 1 })
    .eq("id", "00000000-0000-4000-8000-000000000000");
  check(
    "Anonymous product write is denied",
    Boolean(priceUpdateError) && !isNetworkError(priceUpdateError),
    messageOf(priceUpdateError),
  );

  await checkAnonymousStorageWrite();
}

async function signInClient(email, password, label) {
  const client = supabaseClient();
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    check(`${label} sign-in`, false, messageOf(error) || "no user returned");
    return null;
  }

  check(`${label} sign-in`, true, data.user.id);
  return { client, user: data.user };
}

async function checkAuthenticatedCustomer() {
  const email = process.env.TEST_CUSTOMER_EMAIL?.trim();
  const password = process.env.TEST_CUSTOMER_PASSWORD?.trim();

  if (!email || !password) {
    skip("Authenticated customer RLS checks", "set TEST_CUSTOMER_EMAIL and TEST_CUSTOMER_PASSWORD");
    return;
  }

  const session = await signInClient(email, password, "Customer");
  if (!session) return;

  const { data: isAdmin, error: roleError } = await session.client.rpc(
    "is_admin",
  );
  check(
    "Customer is not privileged",
    !roleError && isAdmin === false,
    messageOf(roleError),
  );

  // PostgREST returns success for an UPDATE that matches zero rows, so a
  // nonexistent id cannot prove RLS. Read a real active product, attempt a
  // price change, and require either a permission error or no visible row
  // change. The follow-up read confirms the stored price is unchanged.
  const { data: product, error: productReadError } = await session.client
    .from("products")
    .select("id, regular_price")
    .limit(1)
    .maybeSingle();
  if (productReadError || !product) {
    check(
      "Customer product write is denied",
      false,
      messageOf(productReadError) || "no active product available for RLS check",
    );
  } else {
    const { data: updated, error: priceUpdateError } = await session.client
      .from("products")
      .update({ regular_price: product.regular_price + 1 })
      .eq("id", product.id)
      .select("id");
    const { data: after } = await session.client
      .from("products")
      .select("regular_price")
      .eq("id", product.id)
      .maybeSingle();
    const denied =
      Boolean(priceUpdateError) ||
      ((updated?.length ?? 0) === 0 && after?.regular_price === product.regular_price);
    check(
      "Customer product write is denied",
      denied && !isNetworkError(priceUpdateError),
      messageOf(priceUpdateError) ||
        `updated=${updated?.length ?? 0} before=${product.regular_price} after=${after?.regular_price ?? "missing"}`,
    );
  }

  const { data: profiles, error: profileError } = await session.client
    .from("profiles")
    .select("id")
    .limit(20);
  check(
    "Customer can read only their own profile",
    !isNetworkError(profileError) &&
      !profileError &&
      (profiles ?? []).every((row) => row.id === session.user.id),
    messageOf(profileError),
  );

  const otherOrderId = process.env.TEST_OTHER_ORDER_ID?.trim();
  if (otherOrderId) {
    const { data: otherOrders, error: orderError } = await session.client
      .from("orders")
      .select("id")
      .eq("id", otherOrderId);
    check(
      "Customer cannot read another customer's order",
      !isNetworkError(orderError) &&
        !orderError &&
        (otherOrders?.length ?? 0) === 0,
      messageOf(orderError),
    );
  } else {
    skip("Customer-to-customer order isolation", "set TEST_OTHER_ORDER_ID");
  }

  const path = `products/00000000-0000-4000-8000-000000000000/customer-verify-${Date.now()}.png`;
  const { error: uploadError } = await session.client.storage
    .from(BUCKET_ID)
    .upload(path, tinyPng(), { contentType: "image/png", upsert: false });
  check(
    "Customer Storage write is denied",
    Boolean(uploadError) && !isNetworkError(uploadError),
    messageOf(uploadError),
  );
}

async function checkAuthenticatedAdmin() {
  const email = process.env.TEST_ADMIN_EMAIL?.trim();
  const password = process.env.TEST_ADMIN_PASSWORD?.trim();

  if (!email || !password) {
    skip("Authenticated admin checks", "set TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD");
    return;
  }

  const session = await signInClient(email, password, "Admin");
  if (!session) return;

  const { data: isAdmin, error: roleError } = await session.client.rpc(
    "is_admin",
  );
  check(
    "Admin privilege resolves server-side",
    !roleError && isAdmin === true,
    messageOf(roleError),
  );

  const productId = process.env.TEST_PRODUCT_ID?.trim();
  if (!productId) {
    skip("Admin product write check", "set TEST_PRODUCT_ID");
    return;
  }

  const { data: product, error: readError } = await session.client
    .from("products")
    .select("id, regular_price")
    .eq("id", productId)
    .maybeSingle();
  if (readError || !product) {
    check("Admin can read target product", false, messageOf(readError) || "not found");
    return;
  }

  const { error: updateError } = await session.client
    .from("products")
    .update({ regular_price: product.regular_price })
    .eq("id", productId);
  check("Admin product write is allowed", !updateError, messageOf(updateError));
}

async function checkPhase6Checkout() {
  const { data: report, error: reportError } = await supabase.rpc(
    "phase6_checkout_report",
  );

  if (reportError) {
    check(
      "Phase 6 schema report is available",
      false,
      `${messageOf(reportError)} — apply 0007_phase6_checkout.sql`,
    );
    return;
  }
  check("Phase 6 schema report is available", true);

  const orders = (report ?? []).find((entry) => entry.table_name === "orders");
  const settings = (report ?? []).find(
    (entry) => entry.table_name === "store_settings",
  );

  const orderColumns = new Set(orders?.columns ?? []);
  const missingOrderColumns = [
    "idempotency_key",
    "idempotency_fingerprint",
    "confirmation_token",
  ].filter((column) => !orderColumns.has(column));
  check(
    "Orders have checkout idempotency and confirmation columns",
    missingOrderColumns.length === 0,
    missingOrderColumns.length ? `missing: ${missingOrderColumns.join(", ")}` : "",
  );

  const orderIndexes = new Set(orders?.indexes ?? []);
  const missingIndexes = [
    "orders_idempotency_key_key",
    "orders_confirmation_token_key",
  ].filter((index) => !orderIndexes.has(index));
  check(
    "Checkout uniqueness indexes exist",
    missingIndexes.length === 0,
    missingIndexes.length ? `missing: ${missingIndexes.join(", ")}` : "",
  );

  const settingColumns = new Set(settings?.columns ?? []);
  const missingSettingColumns = ["key", "value", "updated_at"].filter(
    (column) => !settingColumns.has(column),
  );
  check(
    "store_settings columns exist",
    missingSettingColumns.length === 0,
    missingSettingColumns.length ? `missing: ${missingSettingColumns.join(", ")}` : "",
  );
  check("store_settings RLS is enabled", settings?.row_security === true);

  const { data: publicSettings, error: settingsRpcError } = await supabase.rpc(
    "get_checkout_settings",
  );
  check(
    "Public checkout settings are readable",
    !settingsRpcError &&
      Number.isInteger(publicSettings?.deliveryCharge) &&
      publicSettings?.deliveryCharge >= 0 &&
      Number.isInteger(publicSettings?.discount) &&
      publicSettings?.discount === 0,
    messageOf(settingsRpcError),
  );

  const { error: directSettingsError } = await supabase
    .from("store_settings")
    .select("key")
    .limit(1);
  check(
    "Anonymous cannot read store settings directly",
    Boolean(directSettingsError) &&
      !isNetworkError(directSettingsError) &&
      errorCode(directSettingsError) !== "PGRST205",
    messageOf(directSettingsError),
  );

  // Deliberately invalid arguments: if the grant is wrong, validation rejects
  // the call before any order or stock row can be written.
  const { error: placeRpcError } = await supabase.rpc("place_cod_order", {
    p_idempotency_key: "verify-no-write-0001",
    p_idempotency_fingerprint: "0".repeat(64),
    p_customer_id: null,
    p_customer_name: "",
    p_customer_phone: "",
    p_customer_email: null,
    p_delivery_address: {},
    p_notes: null,
    p_items: [],
    p_changed_by: null,
  });
  check(
    "Anonymous cannot place orders",
    Boolean(placeRpcError) && !isNetworkError(placeRpcError),
    messageOf(placeRpcError),
  );

  const { data: hiddenOrder, error: confirmationError } = await supabase.rpc(
    "get_order_confirmation",
    {
      p_order_number: "SD-VERIFY-INVALID",
      p_confirmation_token: "0".repeat(64),
    },
  );
  check(
    "Unknown confirmation token returns no order",
    !confirmationError && hiddenOrder === null,
    messageOf(confirmationError),
  );

  info(
    "Live order placement",
    "not exercised by this script; verify manually with a throwaway product and order",
  );
}

async function checkPhase7Orders() {
  const { data: report, error: reportError } = await supabase.rpc(
    "phase7_orders_report",
  );

  if (reportError) {
    check(
      "Phase 7 schema report is available",
      false,
      `${messageOf(reportError)} — apply 0008_phase7_orders.sql`,
    );
    return;
  }
  check("Phase 7 schema report is available", true);

  const orders = (report ?? []).find((entry) => entry.table_name === "orders");
  const orderColumns = new Set(orders?.columns ?? []);
  const missingColumns = [
    "cancellation_status",
    "cancellation_requested_at",
    "cancellation_reason",
    "cancellation_decided_at",
    "cancellation_stock_restored",
  ].filter((column) => !orderColumns.has(column));
  check(
    "Orders have cancellation and restore-guard columns",
    missingColumns.length === 0,
    missingColumns.length ? `missing: ${missingColumns.join(", ")}` : "",
  );

  for (const table of PHASE7_TABLES) {
    const row = (report ?? []).find((entry) => entry.table_name === table);
    check(`${table} RLS is enabled`, row?.row_security === true);
  }

  const history = (report ?? []).find(
    (entry) => entry.table_name === "order_status_changes",
  );
  check(
    "Status history indexes exist",
    (history?.indexes ?? []).includes(
      "order_status_changes_order_created_idx",
    ),
  );

  const shipment = (report ?? []).find(
    (entry) => entry.table_name === "courier_shipments",
  );
  check(
    "Courier shipment columns exist",
    ["provider", "provider_shipment_id", "estimated_delivery_at"].every(
      (column) => (shipment?.columns ?? []).includes(column),
    ),
  );

  const { error: historyError } = await supabase
    .from("order_status_changes")
    .select("id")
    .limit(1);
  check(
    "Anonymous cannot read status history",
    Boolean(historyError) && !isNetworkError(historyError),
    messageOf(historyError),
  );

  const { error: trackingError } = await supabase.rpc("track_order", {
    p_order_number: "SD-20261127-AAAAAAAA",
    p_phone: "01712345678",
  });
  check(
    "Anonymous cannot track orders",
    Boolean(trackingError) && !isNetworkError(trackingError),
    messageOf(trackingError),
  );
}

async function checkImageReachability(products) {
  const firstPath = products
    .map((product) => {
      const values = Array.isArray(product.images) ? product.images : [];
      return values.map(storagePathFromValue).find(Boolean);
    })
    .find(Boolean);

  if (!firstPath) {
    skip("Product image reachability", "no valid product-images paths on active products");
    return;
  }

  const publicUrl =
    supabase.storage.from(BUCKET_ID).getPublicUrl(firstPath).data.publicUrl;

  try {
    const response = await fetch(publicUrl, { method: "HEAD" });
    check("Product image URL is reachable", response.ok, `HTTP ${response.status}`);
  } catch (error) {
    check("Product image URL is reachable", false, messageOf(error));
  }

  info("Public bucket caveat", "direct /object/public URLs bypass Storage RLS");
}

async function main() {
  const { error: connectionError } = await supabase
    .from("brands")
    .select("id")
    .limit(1);
  check("Supabase connection", !connectionError, messageOf(connectionError));

  const helpersAvailable = await checkSchemaReports();
  if (!helpersAvailable) {
    skip("Policy/FK report checks", "apply 0005_verification.sql");
  }

  await checkTableExistence();
  await checkPhase6Checkout();
  await checkPhase7Orders();

  const products = await checkPublicCatalogue();
  await checkAnonymousRls();
  await checkAuthenticatedCustomer();
  await checkAuthenticatedAdmin();
  await checkImageReachability(products);

  const failed = results.filter((result) => !result.ok);
  console.log(
    `\nSummary: ${results.length - failed.length}/${results.length} checks passed.`,
  );

  if (failed.length > 0) {
    console.error(`${failed.length} verification check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log("All executed Supabase verification checks passed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
